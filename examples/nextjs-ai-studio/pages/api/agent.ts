import type { NextApiRequest, NextApiResponse } from "next";
import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";

import { SYSTEM_PROMPT } from "../../utils/agentPrompt";
import {
  createProjectTools,
  parseGlobalCommand,
  runGlobalAction,
  type ChangeTracker,
  type GlobalToolResult,
} from "../../utils/agentTools";
import { loadMcpTools } from "../../utils/mcpClient";
import { getProject } from "../../utils/projectStorage";

const MAX_TOOL_ROUNDS = 6;

type IncomingMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type AgentResponse = {
  message: string;
  toolResults?: Array<{ tool: string; result: unknown }>;
  updatedFiles?: Record<string, { code: string }>;
  error?: string;
};

function toBaseMessage(message: IncomingMessage): BaseMessage {
  if (message.role === "assistant") {
    return new AIMessage(message.content);
  }
  if (message.role === "system") {
    return new SystemMessage(message.content);
  }
  return new HumanMessage(message.content);
}

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : item?.text ?? ""))
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: string }).text ?? "");
  }
  return "";
}

function getToolCalls(message: AIMessage): Array<{ id?: string; name: string; args: unknown }> {
  const anyMessage = message as AIMessage & { tool_calls?: any[]; toolCalls?: any[] };
  return anyMessage.tool_calls || anyMessage.toolCalls || [];
}

function formatGlobalResult(result: GlobalToolResult): string {
  if (!result.ok) {
    return `global 失败: ${result.message}`;
  }

  if (result.action === "read") {
    const data = result.data as { path?: string; content?: string } | undefined;
    if (data?.content) {
      return `已读取 ${data.path}\n\n${data.content}`;
    }
  }

  if (result.action === "list") {
    const data = result.data as { files?: string[] } | undefined;
    if (data?.files) {
      return `文件列表 (共 ${data.files.length} 个):\n${data.files.join("\n")}`;
    }
  }

  if (result.action === "search") {
    const data = result.data as { results?: Array<{ path: string; matches: any[] }> } | undefined;
    if (data?.results) {
      const summary = data.results
        .map((entry) => `${entry.path} (${entry.matches.length})`)
        .join("\n");
      return `搜索结果:\n${summary}`;
    }
  }

  return result.message;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<AgentResponse>) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ message: "", error: `方法 ${req.method} 不被允许` });
    return;
  }

  const token = typeof req.query.token === "string" ? req.query.token : (req.body?.token as string);
  if (!token) {
    res.status(400).json({ message: "", error: "缺少token参数" });
    return;
  }

  const project = await getProject(token);
  if (!project) {
    res.status(404).json({ message: "", error: "项目不存在" });
    return;
  }

  const incomingMessages = (req.body?.messages as IncomingMessage[]) || [];
  if (incomingMessages.length === 0) {
    res.status(400).json({ message: "", error: "缺少messages" });
    return;
  }

  const lastMessage = incomingMessages[incomingMessages.length - 1];
  const shouldStream =
    (typeof req.query.stream === "string" && req.query.stream !== "0") ||
    req.body?.stream === true;

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const startStream = () => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
  };
  if (lastMessage?.role === "user") {
    const parsed = parseGlobalCommand(lastMessage.content);
    if (parsed) {
      if (!parsed.ok) {
        if (shouldStream) {
          startStream();
          sendEvent("message", {
            message: parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""),
          });
          sendEvent("done", {});
          res.end();
          return;
        }
        res.status(200).json({
          message: parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""),
        });
        return;
      }
      const tracker: ChangeTracker = { changed: false, paths: new Set() };
      const result = await runGlobalAction(token, parsed.input, tracker);
      const updatedFiles = tracker.changed
        ? await getProject(token).then((data) => {
            if (!data) return undefined;
            const output: Record<string, { code: string }> = {};
            tracker.paths.forEach((path) => {
              if (data.files[path]) {
                output[path] = data.files[path];
              }
            });
            return output;
          })
        : undefined;

      if (shouldStream) {
        startStream();
        sendEvent("message", { message: formatGlobalResult(result), updatedFiles });
        sendEvent("done", {});
        res.end();
        return;
      }
      res.status(200).json({ message: formatGlobalResult(result), updatedFiles });
      return;
    }
  }

  const inferredProvider =
    process.env.AI_PROVIDER ||
    (process.env.GOOGLE_API_KEY ? "google" : "openai");
  const provider = inferredProvider.toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const googleKey = process.env.GOOGLE_API_KEY;
  const openaiBaseUrl = process.env.OPENAI_BASE_URL;
  const googleBaseUrl = process.env.GOOGLE_BASE_URL;

  if (provider === "openai" && !openaiKey) {
    res.status(400).json({
      message: "",
      error: "缺少 OPENAI_API_KEY，无法调用模型。可以用 /global 指令执行文件操作。",
    });
    return;
  }

  if (provider === "google" && !googleKey) {
    res.status(400).json({
      message: "",
      error: "缺少 GOOGLE_API_KEY，无法调用模型。可以用 /global 指令执行文件操作。",
    });
    return;
  }

  const tracker: ChangeTracker = { changed: false, paths: new Set() };
  const localTools = createProjectTools(token, tracker);
  const mcpTools = await loadMcpTools();
  const allTools = [...localTools, ...mcpTools];
  const toolMap = new Map(allTools.map((toolItem) => [toolItem.name, toolItem]));

  const googleModelName = process.env.GOOGLE_MODEL || "gemini-1.5-flash";
  const openaiModelName = process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini";
  const isGemini3 = provider === "google" && googleModelName.toLowerCase().startsWith("gemini-3");

  const model =
    provider === "google"
      ? new (await import("@langchain/google-genai")).ChatGoogleGenerativeAI({
          apiKey: googleKey,
          model: googleModelName,
          temperature: 0.2,
          baseUrl: googleBaseUrl || undefined,
        })
      : new (await import("@langchain/openai")).ChatOpenAI({
          apiKey: openaiKey,
          model: openaiModelName,
          temperature: 0.2,
          configuration: openaiBaseUrl ? { baseURL: openaiBaseUrl } : undefined,
        });

  const shouldBindTools = allTools.length > 0 && !isGemini3;
  const modelWithTools = shouldBindTools ? model.bindTools(allTools) : model;
  const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];
  if (isGemini3 && allTools.length > 0) {
    messages[0] = new SystemMessage(
      `${SYSTEM_PROMPT}\n\n注意：Gemini 3 系列目前对工具调用要求 thought_signature（JS SDK 尚未支持）。已临时关闭工具调用。请改用 gemini-1.5/2.0 系列或切换 OpenAI 以启用工具。`
    );
  }
  messages.push(...incomingMessages.map(toBaseMessage));

  let response = (await modelWithTools.invoke(messages)) as AIMessage;
  const toolResults: Array<{ tool: string; result: unknown }> = [];
  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    const toolCalls = getToolCalls(response);
    if (!toolCalls || toolCalls.length === 0) {
      break;
    }

    const toolMessages: ToolMessage[] = [];
    for (const call of toolCalls) {
      const toolItem = toolMap.get(call.name);
      if (!toolItem) {
        toolMessages.push(
          new ToolMessage({
            tool_call_id: call.id ?? call.name,
            content: JSON.stringify({ ok: false, message: `未找到工具 ${call.name}` }),
          })
        );
        continue;
      }
      const result = await toolItem.invoke(call.args ?? {});
      toolResults.push({ tool: call.name, result });
      toolMessages.push(
        new ToolMessage({
          tool_call_id: call.id ?? call.name,
          content: JSON.stringify(result),
        })
      );
    }

    messages.push(response, ...toolMessages);
    response = (await modelWithTools.invoke(messages)) as AIMessage;
    rounds += 1;
  }

  const updatedFiles = tracker.changed
    ? await getProject(token).then((data) => {
        if (!data) return undefined;
        const output: Record<string, { code: string }> = {};
        tracker.paths.forEach((path) => {
          if (data.files[path]) {
            output[path] = data.files[path];
          }
        });
        return output;
      })
    : undefined;

  const finalMessage =
    extractText(response.content) || (toolResults.length > 0 ? "已完成工具操作。" : "");

  if (shouldStream) {
    startStream();
    const chunks = finalMessage.match(/.{1,80}/g) || [];
    chunks.forEach((chunk) => {
      sendEvent("delta", { delta: chunk });
    });
    sendEvent("message", { message: finalMessage, updatedFiles });
    sendEvent("done", {});
    res.end();
    return;
  }

  res.status(200).json({
    message: finalMessage,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    updatedFiles,
  });
};

export default handler;

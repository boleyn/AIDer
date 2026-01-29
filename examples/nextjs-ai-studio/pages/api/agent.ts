import type { NextApiRequest, NextApiResponse } from "next";
import type {
  BaseMessage,
  MessageContent,
  MessageContentComplex,
  ToolCallChunk,
  ToolCall,
} from "@langchain/core/messages";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  isAIMessage,
  isToolMessage,
} from "@langchain/core/messages";
import { createAgent } from "langchain";
import { getAgentRuntimeConfig } from "../../utils/agentConfig";

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

type IncomingMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  name?: string;
  tool_call_id?: string;
};

type AgentResponse = {
  message: string;
  toolResults?: Array<{ tool: string; result: unknown }>;
  updatedFiles?: Record<string, { code: string }>;
  error?: string;
};

const isMessageContentComplexArray = (
  value: unknown
): value is MessageContentComplex[] =>
  Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null);

const normalizeMessageContent = (content: unknown): MessageContent => {
  if (typeof content === "string") return content;
  if (isMessageContentComplexArray(content)) return content;
  if (content && typeof content === "object" && "text" in content) {
    const record = content as Record<string, unknown>;
    if (typeof record.text === "string") return record.text;
    if (record.text != null) return String(record.text);
  }
  return JSON.stringify(content ?? "");
};

function toBaseMessage(message: IncomingMessage): BaseMessage {
  const content = normalizeMessageContent(message.content ?? "");
  if (message.role === "assistant") {
    return new AIMessage({ content });
  }
  if (message.role === "system") {
    const systemContent =
      typeof content === "string" ? content : JSON.stringify(content);
    return new SystemMessage(systemContent);
  }
  if (message.role === "tool") {
    return new ToolMessage({
      tool_call_id: message.tool_call_id ?? message.name ?? "tool",
      content,
    });
  }
  return new HumanMessage({ content });
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

type LangChainMessageShape = {
  id?: string;
  type: "system" | "human" | "ai" | "tool";
  content: MessageContent;
  additional_kwargs?: Record<string, unknown>;
  tool_calls?: ToolCall[];
  tool_call_chunks?: ToolCallChunk[];
  tool_call_id?: string;
  name?: string;
  status?: "success" | "error";
  artifact?: unknown;
};

type LangChainMessageChunkShape = {
  id?: string;
  type: "AIMessageChunk";
  content?: MessageContent;
  tool_call_chunks?: ToolCallChunk[];
};

const getMessageType = (message: BaseMessage): string => {
  if (typeof (message as BaseMessage).getType === "function") {
    return (message as BaseMessage).getType();
  }
  return (message as BaseMessage & { type?: string }).type ?? "unknown";
};

const serializeMessage = (message: BaseMessage): LangChainMessageShape => {
  const type = getMessageType(message);
  const base = {
    id: message.id,
    content: message.content,
    additional_kwargs: message.additional_kwargs,
  };

  if (type === "ai") {
    const aiMessage = message as BaseMessage & {
      tool_calls?: ToolCall[];
      tool_call_chunks?: ToolCallChunk[];
      status?: "success" | "error";
    };
    return {
      ...base,
      type: "ai",
      tool_calls: aiMessage.tool_calls,
      tool_call_chunks: aiMessage.tool_call_chunks,
      status: aiMessage.status,
    };
  }

  if (type === "tool") {
    const toolMessage = message as BaseMessage & {
      tool_call_id?: string;
      name?: string;
      status?: "success" | "error";
      artifact?: unknown;
    };
    return {
      ...base,
      type: "tool",
      tool_call_id: toolMessage.tool_call_id,
      name: toolMessage.name,
      status: toolMessage.status,
      artifact: toolMessage.artifact,
    };
  }

  if (type === "system") {
    return { ...base, type: "system" };
  }

  return { ...base, type: "human" };
};

const serializeMessageChunk = (chunk: unknown): LangChainMessageChunkShape | null => {
  if (!chunk || typeof chunk !== "object") return null;
  const chunkRecord = chunk as {
    id?: string;
    content?: MessageContent;
    tool_call_chunks?: ToolCallChunk[];
  };
  return {
    id: chunkRecord.id,
    type: "AIMessageChunk",
    content: chunkRecord.content,
    tool_call_chunks: chunkRecord.tool_call_chunks,
  };
};

const normalizeLangChainMessage = (
  value: unknown
): LangChainMessageShape | LangChainMessageChunkShape | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, any>;

  const normalizeToolCallChunks = (chunks: unknown): ToolCallChunk[] | undefined => {
    if (!Array.isArray(chunks)) return undefined;
    return chunks.map((chunk, index) => ({
      ...(chunk ?? {}),
      index: typeof (chunk as ToolCallChunk).index === "number" ? (chunk as ToolCallChunk).index : index + 1,
    })) as ToolCallChunk[];
  };

  if (typeof record.type === "string") {
    if (record.type === "AIMessageChunk") {
      return record as LangChainMessageChunkShape;
    }
    if (
      record.type === "ai" ||
      record.type === "human" ||
      record.type === "system" ||
      record.type === "tool"
    ) {
      return record as LangChainMessageShape;
    }
  }

  if (record.lc === 1 && record.type === "constructor" && Array.isArray(record.id)) {
    const kind = record.id[record.id.length - 1];
    const kwargs = record.kwargs ?? {};
    switch (kind) {
      case "AIMessageChunk":
        return {
          type: "AIMessageChunk",
          id: kwargs.id,
          content: kwargs.content,
          tool_call_chunks: normalizeToolCallChunks(kwargs.tool_call_chunks),
        };
      case "AIMessage":
        return {
          type: "ai",
          id: kwargs.id,
          content: kwargs.content,
          tool_calls: kwargs.tool_calls,
          tool_call_chunks: normalizeToolCallChunks(kwargs.tool_call_chunks),
          status: kwargs.status,
          additional_kwargs: kwargs.additional_kwargs,
        };
      case "HumanMessage":
        return {
          type: "human",
          id: kwargs.id,
          content: kwargs.content,
        };
      case "SystemMessage":
        return {
          type: "system",
          id: kwargs.id,
          content: kwargs.content,
        };
      case "ToolMessage":
        return {
          type: "tool",
          id: kwargs.id,
          content: kwargs.content,
          tool_call_id: kwargs.tool_call_id,
          name: kwargs.name,
          status: kwargs.status ?? "success",
          artifact: kwargs.artifact,
        };
      default:
        return null;
    }
  }

  return null;
};

const extractNestedMessages = (payload: unknown): Array<LangChainMessageShape | LangChainMessageChunkShape> => {
  const collected: Array<LangChainMessageShape | LangChainMessageChunkShape> = [];

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = value as Record<string, unknown>;
    const maybeMessages = record.messages;
    if (Array.isArray(maybeMessages)) {
      for (const message of maybeMessages) {
        const normalized = normalizeLangChainMessage(message);
        if (normalized) collected.push(normalized);
      }
    }

    for (const key of Object.keys(record)) {
      if (key === "messages") continue;
      visit(record[key]);
    }
  };

  visit(payload);
  return collected;
};


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
  if (lastMessage?.role === "user" && typeof lastMessage.content === "string") {
    const parsed = parseGlobalCommand(lastMessage.content);
    if (parsed) {
      if (!parsed.ok) {
      if (shouldStream) {
        startStream();
        sendEvent("messages/complete", [
          {
            type: "ai",
            content: parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""),
          },
        ]);
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
        sendEvent("messages/complete", [
          {
            type: "ai",
            content: formatGlobalResult(result),
          },
        ]);
        if (updatedFiles) {
          sendEvent("files", updatedFiles);
        }
        sendEvent("done", {});
        res.end();
        return;
      }
      res.status(200).json({ message: formatGlobalResult(result), updatedFiles });
      return;
    }
  }

  const runtimeConfig = getAgentRuntimeConfig();
  const provider = runtimeConfig.provider;
  const openaiKey = runtimeConfig.openaiKey;
  const googleKey = runtimeConfig.googleKey;
  const openaiBaseUrl = runtimeConfig.openaiBaseUrl;
  const googleBaseUrl = runtimeConfig.googleBaseUrl;

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

  const model = await getCachedModel({
    provider,
    openaiKey,
    openaiBaseUrl,
    openaiModelName: runtimeConfig.modelName,
    googleKey,
    googleBaseUrl,
    googleModelName: runtimeConfig.modelName,
    temperature: runtimeConfig.temperature,
  });
  
  const agent = createAgent({
    model,
    tools: allTools,
    systemPrompt: SYSTEM_PROMPT,
  });

  if (shouldStream) {
    startStream();
    try {
      const stream = await agent.stream(
        { messages: incomingMessages.map(toBaseMessage) },
        { streamMode: ["messages", "updates"] }
      );

      for await (const chunk of stream) {
        if (!chunk) continue;

        const handleEntry = (mode: string, payload: unknown) => {
          if (mode === "messages") {
            const tuple = Array.isArray(payload)
              ? (payload as [unknown, unknown])
              : [payload, undefined];
            const meta = tuple?.[1] as { langgraph_node?: string; name?: string } | undefined;
            if (meta?.langgraph_node === "tools" || meta?.name === "tools") {
              return;
            }
            const tupleValue = tuple?.[0];
            const messageChunk =
              serializeMessageChunk(tupleValue) ||
              (typeof tupleValue === "string"
                ? {
                    type: "AIMessageChunk",
                    content: tupleValue,
                  }
                : null);
            if (!messageChunk) return;
            sendEvent("messages", [messageChunk, tuple?.[1]]);
            return;
          }

          if (mode === "updates") {
            const state = payload as { messages?: BaseMessage[]; [key: string]: unknown };
            if (Array.isArray(state.messages)) {
              sendEvent("updates", {
                ...state,
                messages: state.messages.map(serializeMessage),
              });
            } else {
              const nestedMessages = extractNestedMessages(payload);
              if (nestedMessages.length > 0) {
                sendEvent("messages/complete", nestedMessages);
              }
              sendEvent("updates", state);
            }
            return;
          }

          sendEvent(mode, payload);
        };

        const isBinaryChunk =
          typeof chunk === "object" &&
          chunk !== null &&
          ArrayBuffer.isView(chunk);
        if (isBinaryChunk) {
          continue;
        }

        const tupleLike =
          Array.isArray(chunk) ||
          (typeof chunk === "object" &&
            chunk !== null &&
            "0" in chunk &&
            "1" in chunk &&
            Object.keys(chunk as Record<string, unknown>).length === 2);

        if (tupleLike) {
          const tuple = Array.isArray(chunk)
            ? chunk
            : [
                (chunk as Record<string, unknown>)[0],
                (chunk as Record<string, unknown>)[1],
              ];
          handleEntry(String(tuple[0]), tuple[1]);
          continue;
        }

        if (typeof chunk === "object") {
          const record = chunk as Record<string, unknown>;
          if ("event" in record && "data" in record) {
            handleEntry(String(record.event), record.data);
            continue;
          }
          for (const [mode, payload] of Object.entries(record)) {
            handleEntry(mode, payload);
          }
        }
      }
    } catch (error) {
      sendEvent("error", {
        error: error instanceof Error ? error.message : "请求失败",
      });
      sendEvent("done", {});
      res.end();
      return;
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

    if (updatedFiles) {
      sendEvent("files", updatedFiles);
    }
    sendEvent("done", {});
    res.end();
    return;
  }

  const result = await agent.invoke({
    messages: incomingMessages.map(toBaseMessage),
  });
  const outputMessages = Array.isArray(result?.messages) ? result.messages : [];
  const toolMessages = outputMessages.filter(isToolMessage);
  const toolResults = toolMessages.map((message) => ({
    tool: message.name ?? message.tool_call_id ?? "tool",
    result: message.content,
  }));
  const aiMessage = [...outputMessages].reverse().find(isAIMessage);

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
    (aiMessage ? extractText(aiMessage.content) : "") ||
    (toolResults.length > 0 ? "已完成工具操作。" : "");

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

type ModelCacheParams = {
  provider: string;
  openaiKey?: string;
  openaiBaseUrl?: string;
  openaiModelName: string;
  googleKey?: string;
  googleBaseUrl?: string;
  googleModelName: string;
  temperature: number;
};

type CachedModel = Awaited<ReturnType<typeof getCachedModel>>;

const modelCache = new Map<string, Promise<CachedModel>>();

const buildModelCacheKey = (params: ModelCacheParams) =>
  JSON.stringify({
    provider: params.provider,
    temperature: params.temperature,
    openaiModelName: params.openaiModelName,
    openaiBaseUrl: params.openaiBaseUrl || "",
    openaiKey: params.openaiKey ? "set" : "missing",
    googleModelName: params.googleModelName,
    googleBaseUrl: params.googleBaseUrl || "",
    googleKey: params.googleKey ? "set" : "missing",
  });

async function getCachedModel(params: ModelCacheParams) {
  const cacheKey = buildModelCacheKey(params);
  const existing = modelCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const modelPromise = (async () => {
    if (params.provider === "google") {
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
      return new ChatGoogleGenerativeAI({
        apiKey: params.googleKey,
        model: params.googleModelName,
        temperature: params.temperature,
        baseUrl: params.googleBaseUrl || undefined,
      });
    }

    const { ChatOpenAI } = await import("@langchain/openai");
    return new ChatOpenAI({
      apiKey: params.openaiKey,
      model: params.openaiModelName,
      temperature: params.temperature,
      configuration: params.openaiBaseUrl
        ? { baseURL: params.openaiBaseUrl }
        : undefined,
    });
  })();

  modelCache.set(cacheKey, modelPromise);
  return modelPromise;
}

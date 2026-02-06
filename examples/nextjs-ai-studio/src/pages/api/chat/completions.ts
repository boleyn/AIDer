import type { ChatCompletionTool, ChatCompletionMessageParam } from "@aistudio/ai/compat/global/core/ai/type";
import { runAgentCall } from "@aistudio/ai/llm/agentCall";
import { formatGlobalResult } from "@server/agent/globalResultFormatter";
import { parseGlobalCommand, runGlobalAction, type ChangeTracker } from "@server/agent/globalTools";
import { loadMcpTools } from "@server/agent/mcpClient";
import { getAgentRuntimeConfig } from "@server/agent/runtimeConfig";
import { createProjectTools } from "@server/agent/tools";
import { requireAuth } from "@server/auth/session";
import {
  getConversation,
  appendConversationMessages,
  replaceConversationMessages,
  type ConversationMessage,
} from "@server/conversations/conversationStorage";
import { getProject } from "@server/projects/projectStorage";
import { extractText, type IncomingMessage } from "@shared/chat/messages";
import { createId } from "@shared/chat/messages";
import type { AgentMessage } from "@shared/chat/messages";
import type { NextApiRequest, NextApiResponse } from "next";

const getToken = (req: NextApiRequest): string | null => {
  const headerToken =
    typeof req.headers["x-project-token"] === "string"
      ? req.headers["x-project-token"]
      : null;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : null;
  return headerToken ?? bodyToken ?? queryToken;
};

const sendSse = (res: NextApiResponse, data: string) => {
  res.write(`data: ${data}\n\n`);
};

const sendSseEvent = (res: NextApiResponse, event: string, data: string) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
};

const SseResponseEventEnum = {
  answer: "answer",
  toolCall: "toolCall",
  toolParams: "toolParams",
  toolResponse: "toolResponse",
  error: "error",
} as const;

const startSse = (res: NextApiResponse) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
};

const toIncomingMessages = (messages: unknown): IncomingMessage[] => {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const record = message as {
        role?: string;
        content?: unknown;
        name?: string;
        tool_call_id?: string;
      };
      if (!record.role) return null;
      const role = record.role;
      if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") {
        return null;
      }
      return {
        role,
        content: record.content ?? "",
        name: record.name,
        tool_call_id: record.tool_call_id,
      } as IncomingMessage;
    })
    .filter((message): message is IncomingMessage => Boolean(message));
};

const toConversationMessage = (message: AgentMessage): ConversationMessage => {
  return {
    role: message.role,
    content: message.content ?? "",
    id: message.id ?? createId(),
    name: message.name,
    tool_call_id: message.tool_call_id,
    tool_calls: message.tool_calls,
  };
};

const normalizeStoredMessages = (messages: ConversationMessage[]) => {
  const seen = new Set<string>();
  const result: ConversationMessage[] = [];
  for (const message of [...messages].reverse()) {
    const id = message.id ?? createId();
    if (seen.has(id)) continue;
    seen.add(id);
    result.push({ ...message, id });
  }
  return result.reverse();
};

const getTitleFromMessages = (messages: ConversationMessage[]): string | undefined => {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) return undefined;
  const text = extractText(lastUser.content).trim();
  if (!text) return undefined;
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `方法 ${req.method} 不被允许` });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const token = getToken(req);
  if (!token) {
    res.status(400).json({ error: "缺少 token 参数" });
    return;
  }

  const incomingMessages = toIncomingMessages(req.body?.messages);
  if (incomingMessages.length === 0) {
    res.status(400).json({ error: "缺少 messages" });
    return;
  }

  const conversationId =
    typeof req.body?.conversation_id === "string"
      ? req.body.conversation_id
      : typeof req.body?.conversationId === "string"
      ? req.body.conversationId
      : undefined;
  const stream = req.body?.stream === true;
  const model = typeof req.body?.model === "string" ? req.body.model : "agent";

  const project = await getProject(token);
  if (!project) {
    res.status(404).json({ error: "项目不存在" });
    return;
  }

  const conversation = conversationId ? await getConversation(token, conversationId) : null;
  if (conversationId && !conversation) {
    res.status(404).json({ error: "对话不存在" });
    return;
  }

  const historyMessages = conversation?.messages ?? [];
  const newMessages = incomingMessages.map((message) => ({
    role: message.role,
    content: message.content,
    id: message.id ?? createId(),
    name: message.name,
    tool_call_id: message.tool_call_id,
    tool_calls: message.tool_calls,
  }));
  const contextMessages = [...historyMessages, ...newMessages];

  const appendAssistantError = async (text: string) => {
    if (!conversationId) return;
    await appendConversationMessages(token, conversationId, [
      { role: "assistant", content: text },
    ]);
  };

  if (conversationId && newMessages.length > 0) {
    await appendConversationMessages(token, conversationId, newMessages);
  }

  if (incomingMessages[incomingMessages.length - 1]?.role === "user") {
    const lastText = extractText(incomingMessages[incomingMessages.length - 1].content);
    const parsed = parseGlobalCommand(lastText);
    if (parsed) {
      if (!parsed.ok) {
        await appendAssistantError(parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""));
        if (stream) {
          startSse(res);
          const created = Math.floor(Date.now() / 1000);
          sendSse(
            res,
            JSON.stringify({
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [
                {
                  index: 0,
                  delta: { content: parsed.message + (parsed.hint ? `\n${parsed.hint}` : "") },
                  finish_reason: null,
                },
              ],
            })
          );
          sendSse(
            res,
            JSON.stringify({
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [
                { index: 0, delta: {}, finish_reason: "stop" },
              ],
            })
          );
          sendSse(res, "[DONE]");
          res.end();
          return;
        }
        res.status(200).json({
          id: `chatcmpl-${Date.now()}`,
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""),
              },
              finish_reason: "stop",
            },
          ],
        });
        return;
      }

      const tracker: ChangeTracker = { changed: false, paths: new Set() };
      const result = await runGlobalAction(token, parsed.input, tracker);
      const assistantResponse = formatGlobalResult(result);

      if (conversationId) {
        const storedMessages = [
          ...contextMessages,
          { role: "assistant", content: assistantResponse } as ConversationMessage,
        ];
        const nextTitle = getTitleFromMessages(storedMessages);
        await replaceConversationMessages(token, conversationId, storedMessages, nextTitle);
      }

      if (stream) {
        startSse(res);
        const created = Math.floor(Date.now() / 1000);
        sendSse(
          res,
          JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [
              {
                index: 0,
                delta: { content: assistantResponse },
                finish_reason: null,
              },
            ],
          })
        );
        sendSse(
          res,
          JSON.stringify({
            id: `chatcmpl-${Date.now()}`,
            object: "chat.completion.chunk",
            created,
            model,
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          })
        );
        sendSse(res, "[DONE]");
        res.end();
        return;
      }

      res.status(200).json({
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [
          {
            index: 0,
            message: { role: "assistant", content: assistantResponse },
            finish_reason: "stop",
          },
        ],
      });
      return;
    }
  }

  const runtimeConfig = getAgentRuntimeConfig();
  if (!runtimeConfig.apiKey) {
    const errorMessage = "缺少 AIPROXY_API_TOKEN/CHAT_API_KEY，无法调用模型。";
    await appendAssistantError(errorMessage);
    res.status(400).json({ error: errorMessage });
    return;
  }

  const tracker: ChangeTracker = { changed: false, paths: new Set() };
  const localTools = createProjectTools(token, tracker);
  const mcpTools = await loadMcpTools();
  const allTools = [...localTools, ...mcpTools];
  const selectedModel = model && model !== "agent" ? model : runtimeConfig.toolCallModel;

  const tools: ChatCompletionTool[] = allTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const toAgentMessages = (messages: ConversationMessage[]): ChatCompletionMessageParam[] =>
    messages.map((message) => ({
      role: message.role,
      content: extractText(message.content),
      name: message.name,
      tool_call_id: message.tool_call_id,
      tool_calls: message.tool_calls,
    })) as ChatCompletionMessageParam[];

  if (stream) {
    startSse(res);
  }

  const created = Math.floor(Date.now() / 1000);

  type AgentRunBody = Parameters<typeof runAgentCall>[0]["body"];
  const agentRunBody: AgentRunBody = {
    model: selectedModel,
    messages: toAgentMessages(contextMessages),
    max_tokens: undefined,
    tools,
    temperature: runtimeConfig.temperature,
    stream,
    toolCallMode: "toolChoice",
  };

  const runResult = await runAgentCall({
    maxRunAgentTimes: runtimeConfig.recursionLimit || 6,
    body: agentRunBody,
    handleInteractiveTool: async () => ({
      response: "",
      assistantMessages: [],
      usages: [],
      stop: true,
    }),
    onStreaming: stream
      ? ({ text }) => {
          if (!text) return;
          sendSseEvent(
            res,
            SseResponseEventEnum.answer,
            JSON.stringify({
              id: `chatcmpl-${Date.now()}`,
              object: "chat.completion.chunk",
              created,
              model,
              choices: [
                {
                  index: 0,
                  delta: { content: text },
                  finish_reason: null,
                },
              ],
            })
          );
        }
      : undefined,
    onToolCall: stream
      ? ({ call }) => {
          sendSseEvent(
            res,
            SseResponseEventEnum.toolCall,
            JSON.stringify({
              id: call.id,
              toolName: call.function?.name,
            })
          );
        }
      : undefined,
    onToolParam: stream
      ? ({ tool, params }) => {
          sendSseEvent(
            res,
            SseResponseEventEnum.toolParams,
            JSON.stringify({
              id: tool.id,
              toolName: tool.function?.name,
              params,
            })
          );
        }
      : undefined,
    handleToolResponse: async ({ call }) => {
      const tool = allTools.find((item) => item.name === call.function.name);
      let response = "";
      if (!tool) {
        response = `未找到工具: ${call.function.name}`;
      } else {
        try {
          const parsed = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          const result = await tool.run(parsed);
          response = typeof result === "string" ? result : JSON.stringify(result);
        } catch (error) {
          response = error instanceof Error ? error.message : "工具执行失败";
        }
      }
      const formatArgs = () => {
        if (!call.function.arguments) return "";
        try {
          const parsed = JSON.parse(call.function.arguments);
          return JSON.stringify(parsed, null, 2);
        } catch {
          return call.function.arguments;
        }
      };
      const toolPayload = {
        toolName: call.function.name,
        params: formatArgs(),
        response,
      };
      const toolContent = JSON.stringify(toolPayload);
      if (stream) {
        sendSseEvent(
          res,
          SseResponseEventEnum.toolResponse,
          JSON.stringify({
            id: call.id,
            toolName: call.function.name,
            params: formatArgs(),
            response,
          })
        );
      }

      return {
        response: toolContent,
        assistantMessages: [
          {
            role: "tool",
            tool_call_id: call.id,
            name: call.function.name,
            content: toolContent,
          } as ChatCompletionMessageParam,
        ],
        usages: [],
      };
    },
  });

  const assistantMessage =
    [...runResult.assistantMessages].reverse().find((item) => item.role === "assistant") ||
    runResult.assistantMessages[runResult.assistantMessages.length - 1];
  const finalMessage = assistantMessage ? extractText(assistantMessage.content) : "";

  if (conversationId) {
    const storedMessages = normalizeStoredMessages(
      runResult.completeMessages.map(toConversationMessage)
    );
    const nextTitle = getTitleFromMessages(storedMessages);
    await replaceConversationMessages(token, conversationId, storedMessages, nextTitle);
  }

  if (!stream) {
    res.status(200).json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: finalMessage },
          finish_reason: runResult.finish_reason || "stop",
        },
      ],
    });
    return;
  }

  sendSseEvent(
    res,
    SseResponseEventEnum.answer,
    JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    })
  );
  sendSseEvent(res, SseResponseEventEnum.answer, "[DONE]");
  res.end();
}

import type { ChatCompletionTool, ChatCompletionMessageParam } from "@aistudio/ai/compat/global/core/ai/type";
import { formatGlobalResult } from "@server/agent/globalResultFormatter";
import { parseGlobalCommand, runGlobalAction, type ChangeTracker } from "@server/agent/globalTools";
import { loadMcpTools } from "@server/agent/mcpClient";
import { getAgentRuntimeConfig } from "@server/agent/runtimeConfig";
import { createProjectTools } from "@server/agent/tools";
import { runSimpleAgentWorkflow } from "@server/agent/workflow/simpleAgentWorkflow";
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
import { SseResponseEventEnum } from "@shared/network/sseEvents";
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

const sendSseEvent = (res: NextApiResponse, event: string, data: string) => {
  res.write(`event: ${event}\n`);
  res.write(`data: ${data}\n\n`);
};

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

const CONVERSATION_ROLES = ["user", "assistant", "system", "tool"] as const;
type ConversationRole = (typeof CONVERSATION_ROLES)[number];

const chatCompletionMessageToConversationMessage = (
  message: ChatCompletionMessageParam
): ConversationMessage => {
  const role = CONVERSATION_ROLES.includes(message.role as ConversationRole)
    ? (message.role as ConversationRole)
    : "assistant";
  const content =
    typeof (message as { content?: unknown }).content === "string"
      ? (message as { content: string }).content
      : extractText((message as { content?: unknown }).content);
  return {
    role,
    content: content ?? "",
    id: (message as { id?: string }).id ?? createId(),
    name: (message as { name?: string }).name,
    tool_call_id: (message as { tool_call_id?: string }).tool_call_id,
    tool_calls: (message as { tool_calls?: ConversationMessage["tool_calls"] }).tool_calls,
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

const createNodeResponseMessages = (
  responses: Array<{
    nodeId: string;
    moduleName: string;
    moduleType: "tool";
    runningTime: number;
    status: "success" | "error";
    toolInput: unknown;
    toolRes: unknown;
  }>
): ConversationMessage[] =>
  responses.map((item, index) => {
    const statusLabel = item.status === "error" ? "❌" : "✅";
    const runningTimeLabel = Number.isFinite(item.runningTime)
      ? `${item.runningTime.toFixed(2)}s`
      : "";
    const title = [item.moduleName, statusLabel, runningTimeLabel].filter(Boolean).join(" · ");

    return {
      role: "tool",
      id: `node-response-${item.nodeId}-${index}-${Date.now()}`,
      name: title,
      content: JSON.stringify({
        toolName: title,
        params:
          typeof item.toolInput === "string"
            ? item.toolInput
            : JSON.stringify(item.toolInput, null, 2),
        response:
          typeof item.toolRes === "string"
            ? item.toolRes
            : JSON.stringify(
                {
                  result: item.toolRes,
                  runningTime: item.runningTime,
                  status: item.status,
                },
                null,
                2
              ),
      }),
    };
  });

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
  const created = Math.floor(Date.now() / 1000);

  const emitAnswerChunk = (text: string, finishReason: string | null = null) => {
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
            delta: text ? { content: text } : {},
            finish_reason: finishReason,
          },
        ],
      })
    );
  };

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
          emitAnswerChunk(parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""));
          emitAnswerChunk("", "stop");
          sendSseEvent(res, SseResponseEventEnum.answer, "[DONE]");
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
        emitAnswerChunk(assistantResponse);
        emitAnswerChunk("", "stop");
        sendSseEvent(res, SseResponseEventEnum.answer, "[DONE]");
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

  const workflowStartAt = Date.now();
  const { runResult, finalMessage, flowResponses } = await runSimpleAgentWorkflow({
    selectedModel,
    stream,
    recursionLimit: runtimeConfig.recursionLimit || 6,
    temperature: runtimeConfig.temperature,
    messages: toAgentMessages(contextMessages),
    allTools,
    tools,
    onEvent: (event, data) => {
      if (!stream) return;

      if (event === SseResponseEventEnum.answer) {
        const text = typeof data.text === "string" ? data.text : "";
        if (!text) return;
        emitAnswerChunk(text);
        return;
      }

      sendSseEvent(res, event, JSON.stringify(data));
    },
  });
  const durationSeconds = Number(((Date.now() - workflowStartAt) / 1000).toFixed(2));

  if (stream) {
    sendSseEvent(
      res,
      SseResponseEventEnum.workflowDuration,
      JSON.stringify({ durationSeconds })
    );
  }

  if (conversationId) {
    const storedMessages = normalizeStoredMessages(
      runResult.completeMessages.map(chatCompletionMessageToConversationMessage)
    );

    const assistantIndex = (() => {
      for (let i = storedMessages.length - 1; i >= 0; i -= 1) {
        if (storedMessages[i].role === "assistant") return i;
      }
      return -1;
    })();
    if (assistantIndex >= 0) {
      const current = storedMessages[assistantIndex];
      const currentKwargs =
        current.additional_kwargs && typeof current.additional_kwargs === "object"
          ? current.additional_kwargs
          : {};
      storedMessages[assistantIndex] = {
        ...current,
        additional_kwargs: {
          ...currentKwargs,
          responseData: flowResponses,
          durationSeconds,
        },
      };
    }

    const nodeResponseMessages = createNodeResponseMessages(flowResponses);
    if (nodeResponseMessages.length > 0) {
      storedMessages.push(...nodeResponseMessages);
    }

    const nextTitle = getTitleFromMessages(storedMessages);
    await replaceConversationMessages(token, conversationId, storedMessages, nextTitle);
  }

  if (!stream) {
    res.status(200).json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model,
      responseData: flowResponses,
      durationSeconds,
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

  emitAnswerChunk("", "stop");
  sendSseEvent(res, SseResponseEventEnum.answer, "[DONE]");
  res.end();
}

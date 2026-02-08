import type { ChatCompletionTool, ChatCompletionMessageParam } from "@aistudio/ai/compat/global/core/ai/type";
import { formatGlobalResult } from "@server/agent/globalResultFormatter";
import { parseGlobalCommand, runGlobalAction, type ChangeTracker } from "@server/agent/globalTools";
import { loadMcpTools } from "@server/agent/mcpClient";
import { getAgentRuntimeConfig } from "@server/agent/runtimeConfig";
import { createProjectTools } from "@server/agent/tools";
import { runSimpleAgentWorkflow } from "@server/agent/workflow/simpleAgentWorkflow";
import { getChatModelCatalog } from "@server/aiProxy/modelCatalog";
import { requireAuth } from "@server/auth/session";
import {
  registerActiveConversationRun,
  unregisterActiveConversationRun,
} from "@server/chat/activeRuns";
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
        id?: string;
        name?: string;
        tool_call_id?: string;
        tool_calls?: IncomingMessage["tool_calls"];
        additional_kwargs?: IncomingMessage["additional_kwargs"];
        status?: IncomingMessage["status"];
        artifact?: IncomingMessage["artifact"];
      };
      if (!record.role) return null;
      const role = record.role;
      if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") {
        return null;
      }
      return {
        role,
        content: record.content ?? "",
        id: record.id,
        name: record.name,
        tool_call_id: record.tool_call_id,
        tool_calls: record.tool_calls,
        additional_kwargs: record.additional_kwargs,
        status: record.status,
        artifact: record.artifact,
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

const toStringValue = (value: unknown) => {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const mergeAssistantToolMessages = (messages: ConversationMessage[]): ConversationMessage[] => {
  const output: ConversationMessage[] = [];
  const pendingCalls = new Map<string, { toolName?: string; params?: string }>();

  const appendToolToLastAssistant = (tool: {
    id?: string;
    toolName?: string;
    params?: string;
    response?: string;
  }) => {
    for (let i = output.length - 1; i >= 0; i -= 1) {
      if (output[i].role !== "assistant") continue;
      const current = output[i];
      const kwargs =
        current.additional_kwargs && typeof current.additional_kwargs === "object"
          ? current.additional_kwargs
          : {};
      const toolDetails = Array.isArray(kwargs.toolDetails) ? kwargs.toolDetails : [];
      output[i] = {
        ...current,
        additional_kwargs: {
          ...kwargs,
          toolDetails: [...toolDetails, tool],
        },
      };
      return;
    }
  };

  for (const message of messages) {
    if (message.role === "assistant") {
      if (Array.isArray(message.tool_calls)) {
        for (const call of message.tool_calls) {
          if (!call?.id) continue;
          pendingCalls.set(call.id, {
            toolName: call.function?.name,
            params: call.function?.arguments || "",
          });
        }
      }
      output.push(message);
      continue;
    }

    if (message.role === "tool") {
      let parsed: unknown = null;
      if (typeof message.content === "string") {
        try {
          parsed = JSON.parse(message.content || "{}");
        } catch {
          parsed = null;
        }
      }
      const parsedObj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
      const toolId =
        message.tool_call_id ||
        (typeof parsedObj.id === "string" ? parsedObj.id : undefined) ||
        message.id;
      const pending = toolId ? pendingCalls.get(toolId) : undefined;
      appendToolToLastAssistant({
        id: toolId,
        toolName:
          message.name ||
          (typeof parsedObj.toolName === "string" ? parsedObj.toolName : undefined) ||
          pending?.toolName ||
          "工具",
        params:
          (typeof parsedObj.params === "string" ? parsedObj.params : undefined) ||
          pending?.params ||
          "",
        response:
          (typeof parsedObj.response === "string" ? parsedObj.response : undefined) ||
          toStringValue(message.content),
      });
      continue;
    }

    output.push(message);
  }

  return output;
};

const getTitleFromMessages = (messages: ConversationMessage[]): string | undefined => {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  if (!lastUser) return undefined;
  const text = extractText(lastUser.content).trim();
  if (!text) return undefined;
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
};

const isModelUnavailableError = (error: unknown) => {
  const text = error instanceof Error ? error.message : String(error ?? "");
  return /does not exist|do not have access|model.*not found/i.test(text);
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
  let streamStarted = false;

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
  const startStream = () => {
    if (streamStarted) return;
    startSse(res);
    streamStarted = true;
  };

  try {
  const project = await getProject(token);
  if (!project) {
    res.status(404).json({ error: "项目不存在" });
    return;
  }

  const conversation = conversationId ? await getConversation(token, conversationId) : null;

  const historyMessages = conversation?.messages ?? [];
  const newMessages = incomingMessages.map((message) => ({
    role: message.role,
    content: message.content,
    id: message.id ?? createId(),
    name: message.name,
    tool_call_id: message.tool_call_id,
    tool_calls: message.tool_calls,
    additional_kwargs: message.additional_kwargs,
    status: message.status,
    artifact: message.artifact,
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
          startStream();
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
        startStream();
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
  const requestedModel = model && model !== "agent" ? model : runtimeConfig.toolCallModel;
  const catalog = await getChatModelCatalog().catch(() => ({
    models: [] as Array<{ id: string; label: string; source: "aiproxy" | "env" }>,
    defaultModel: requestedModel,
    toolCallModel: runtimeConfig.toolCallModel,
    normalModel: runtimeConfig.normalModel,
    source: "env" as const,
    fetchedAt: new Date().toISOString(),
    warning: "models_catalog_fetch_failed",
  }));
  const availableModels = new Set(catalog.models.map((item) => item.id));
  const selectedModel =
    availableModels.size === 0
      ? requestedModel
      : availableModels.has(requestedModel)
      ? requestedModel
      : availableModels.has(catalog.defaultModel)
      ? catalog.defaultModel
      : catalog.models[0]?.id || requestedModel;

  const tools: ChatCompletionTool[] = allTools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));

  const toAgentMessages = (messages: ConversationMessage[]): ChatCompletionMessageParam[] =>
    messages.map((message) => {
      const baseText = extractText(message.content);
      const filePrompt =
        message.role === "user" &&
        message.additional_kwargs &&
        typeof message.additional_kwargs.filePrompt === "string"
          ? message.additional_kwargs.filePrompt
          : "";

      const content = filePrompt
        ? [baseText, "以下为用户附加文件内容:", filePrompt].filter(Boolean).join("\n\n")
        : baseText;

      return {
        role: message.role,
        content,
        name: message.name,
        tool_call_id: message.tool_call_id,
        tool_calls: message.tool_calls,
      };
    }) as ChatCompletionMessageParam[];

  if (stream) {
    startStream();
  }

  const workflowStartAt = Date.now();
  const workflowAbortController = new AbortController();
  if (conversationId) {
    registerActiveConversationRun({
      token,
      chatId: conversationId,
      controller: workflowAbortController,
    });
  }

  const tryRunWorkflow = async (modelToUse: string) =>
    runSimpleAgentWorkflow({
      selectedModel: modelToUse,
      stream,
      recursionLimit: runtimeConfig.recursionLimit || 6,
      temperature: runtimeConfig.temperature,
      messages: toAgentMessages(contextMessages),
      allTools,
      tools,
      abortSignal: workflowAbortController.signal,
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

  const fallbackModelCandidates = [
    catalog.defaultModel,
    runtimeConfig.normalModel,
    runtimeConfig.toolCallModel,
  ].filter((item): item is string => Boolean(item && item !== selectedModel));

  const { runResult, finalMessage, flowResponses } = await (async () => {
    try {
      return await tryRunWorkflow(selectedModel);
    } catch (error) {
      if (isModelUnavailableError(error) && fallbackModelCandidates.length > 0) {
        return await tryRunWorkflow(fallbackModelCandidates[0]);
      }
      throw error;
    } finally {
      if (conversationId) {
        unregisterActiveConversationRun({
          token,
          chatId: conversationId,
          controller: workflowAbortController,
        });
      }
    }
  })();
  const durationSeconds = Number(((Date.now() - workflowStartAt) / 1000).toFixed(2));
  const resolvedFinalMessage = (() => {
    if (finalMessage) return finalMessage;
    const assistantMessage =
      [...runResult.assistantMessages].reverse().find((item) => item.role === "assistant") ||
      runResult.assistantMessages[runResult.assistantMessages.length - 1];
    if (!assistantMessage || typeof assistantMessage !== "object") return "";
    const reasoning =
      (assistantMessage as { reasoning_text?: unknown; reasoning_content?: unknown })
        .reasoning_text ??
      (assistantMessage as { reasoning_text?: unknown; reasoning_content?: unknown })
        .reasoning_content;
    return typeof reasoning === "string" ? reasoning : "";
  })();

  if (stream) {
    sendSseEvent(
      res,
      SseResponseEventEnum.workflowDuration,
      JSON.stringify({ durationSeconds })
    );
  }

  if (conversationId) {
    const storedMessages = mergeAssistantToolMessages(
      normalizeStoredMessages(
      runResult.completeMessages.map(chatCompletionMessageToConversationMessage)
      )
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
      const currentText = extractText(current.content);
      storedMessages[assistantIndex] = {
        ...current,
        content: currentText || resolvedFinalMessage,
        additional_kwargs: {
          ...currentKwargs,
          responseData: flowResponses,
          durationSeconds,
        },
      };
    }

    const nextTitle = getTitleFromMessages(storedMessages) || getTitleFromMessages(contextMessages);
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
          message: { role: "assistant", content: resolvedFinalMessage },
          finish_reason: runResult.finish_reason || "stop",
        },
      ],
    });
    return;
  }

  emitAnswerChunk("", "stop");
  sendSseEvent(res, SseResponseEventEnum.answer, "[DONE]");
  res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "未知错误");
    if (stream) {
      startStream();
      emitAnswerChunk(`请求失败: ${message}`);
      emitAnswerChunk("", "stop");
      sendSseEvent(res, SseResponseEventEnum.answer, "[DONE]");
      res.end();
      return;
    }
    res.status(500).json({ error: message });
  }
}

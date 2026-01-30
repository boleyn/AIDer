import type { NextApiRequest, NextApiResponse } from "next";
import { isAIMessage, isToolMessage, trimMessages } from "@langchain/core/messages";
import { createAgent, createMiddleware, summarizationMiddleware } from "langchain";
import { getAgentRuntimeConfig } from "../../utils/agentConfig";

import { SYSTEM_PROMPT } from "../../utils/agentPrompt";
import { parseGlobalCommand, runGlobalAction, type ChangeTracker } from "../../utils/agentTools";
import { formatGlobalResult } from "../../utils/agent/globalResultFormatter";
import { getCachedModel } from "../../utils/agent/modelCache";
import { createSseHelpers, consumeAgentStream } from "../../utils/agent/streaming";
import type { IncomingMessage } from "../../utils/agent/messageSerialization";
import {
  extractText,
  serializeMessage,
  type LangChainMessageShape,
  toBaseMessage,
} from "../../utils/agent/messageSerialization";
import { createProjectTools } from "../../utils/agent/tools";
import { loadMcpTools } from "../../utils/mcpClient";
import { getProject } from "../../utils/projectStorage";
import {
  getConversation,
  appendConversationMessages,
  replaceConversationMessages,
  type ConversationMessage,
} from "../../utils/conversationStorage";

type AgentResponse = {
  message: string;
  toolResults?: Array<{ tool: string; result: unknown }>;
  updatedFiles?: Record<string, { code: string }>;
  error?: string;
};

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
  const conversationId =
    typeof req.body?.conversationId === "string" ? req.body.conversationId : undefined;

  const normalizeIncomingMessages = (messages: IncomingMessage[]): ConversationMessage[] =>
    messages.map((message) => ({
      role: message.role,
      content: message.content,
      name: message.name,
      tool_call_id: message.tool_call_id,
    }));

  const toConversationMessage = (
    message: LangChainMessageShape
  ): ConversationMessage => {
    if (message.type === "human") {
      return { role: "user", content: message.content };
    }
    if (message.type === "ai") {
      return { role: "assistant", content: message.content };
    }
    if (message.type === "system") {
      return { role: "system", content: message.content };
    }
    return {
      role: "tool",
      content: message.content,
      name: message.name,
      tool_call_id: message.tool_call_id,
    };
  };

  const getTitleFromMessages = (messages: ConversationMessage[]): string | undefined => {
    const firstUser = messages.find((message) => message.role === "user");
    if (!firstUser) return undefined;
    const text = extractText(firstUser.content).trim();
    if (!text) return undefined;
    return text.length > 40 ? `${text.slice(0, 40)}...` : text;
  };

  const conversation = conversationId ? await getConversation(token, conversationId) : null;
  if (conversationId && !conversation) {
    res.status(404).json({ message: "", error: "对话不存在" });
    return;
  }

  const historyMessages = conversation?.messages ?? [];
  const newMessages = normalizeIncomingMessages(incomingMessages);
  const contextMessages = [...historyMessages, ...newMessages];
  const shouldStream =
    (typeof req.query.stream === "string" && req.query.stream !== "0") ||
    req.body?.stream === true;

  const appendAssistantError = async (text: string) => {
    if (!conversationId) return;
    await appendConversationMessages(token, conversationId, [
      { role: "assistant", content: text },
    ]);
  };

  if (conversationId && newMessages.length > 0) {
    await appendConversationMessages(token, conversationId, newMessages);
  }

  const { sendEvent, startStream } = createSseHelpers(res);
  if (lastMessage?.role === "user" && typeof lastMessage.content === "string") {
    const parsed = parseGlobalCommand(lastMessage.content);
    if (parsed) {
      if (!parsed.ok) {
        await appendAssistantError(parsed.message + (parsed.hint ? `\n${parsed.hint}` : ""));
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
      const assistantResponse = formatGlobalResult(result);

      if (conversationId) {
        const storedMessages = [
          ...contextMessages,
          { role: "assistant", content: assistantResponse } as ConversationMessage,
        ];
        const nextTitle =
          conversation?.title === "新对话" ? getTitleFromMessages(storedMessages) : undefined;
        await replaceConversationMessages(token, conversationId, storedMessages, nextTitle);
      }

      if (shouldStream) {
        startStream();
        sendEvent("messages/complete", [
          {
            type: "ai",
            content: assistantResponse,
          },
        ]);
        if (updatedFiles) {
          sendEvent("files", updatedFiles);
        }
        sendEvent("done", {});
        res.end();
        return;
      }
      res.status(200).json({ message: assistantResponse, updatedFiles });
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
    const errorMessage =
      "缺少 OPENAI_API_KEY，无法调用模型。可以用 /global 指令执行文件操作。";
    await appendAssistantError(errorMessage);
    res.status(400).json({
      message: "",
      error: errorMessage,
    });
    return;
  }

  if (provider === "google" && !googleKey) {
    const errorMessage =
      "缺少 GOOGLE_API_KEY，无法调用模型。可以用 /global 指令执行文件操作。";
    await appendAssistantError(errorMessage);
    res.status(400).json({
      message: "",
      error: errorMessage,
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

  const trimMessageHistory = createMiddleware({
    name: "TrimMessages",
    beforeModel: async (state) => {
      const approximateTokenCount = (messages: { content?: unknown }[]) =>
        messages.reduce((total, message) => {
          const text = extractText(message?.content ?? "");
          return total + Math.ceil(text.length / 4);
        }, 0);
      const trimmed = await trimMessages(state.messages, {
        maxTokens: 2000,
        strategy: "last",
        startOn: "human",
        endOn: ["human", "tool"],
        tokenCounter: approximateTokenCount,
      });
      return { messages: trimmed };
    },
  });

  const summarization = summarizationMiddleware({
    model,
    trigger: { tokens: 4000 },
    keep: { messages: 20 },
  });

  const agent = createAgent({
    model,
    tools: allTools,
    systemPrompt: SYSTEM_PROMPT,
    middleware: [summarization, trimMessageHistory],
  });

  if (shouldStream) {
    startStream();
    try {
      const stream = await agent.stream(
        { messages: contextMessages.map(toBaseMessage) },
        { streamMode: ["messages", "updates"] }
      );

      const completeMessages: LangChainMessageShape[] = [];

      await consumeAgentStream(stream, sendEvent, {
        onCompleteMessages: (messages) => {
          completeMessages.push(...messages);
        },
      });

      if (conversationId) {
        const storedMessages = [
          ...contextMessages,
          ...completeMessages.map(toConversationMessage),
        ];
        const nextTitle =
          conversation?.title === "新对话" ? getTitleFromMessages(storedMessages) : undefined;
        await replaceConversationMessages(token, conversationId, storedMessages, nextTitle);
      }
    } catch (error) {
      await appendAssistantError(error instanceof Error ? error.message : "请求失败");
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
    messages: contextMessages.map(toBaseMessage),
  });
  const outputMessages = Array.isArray(result?.messages) ? result.messages : [];
  const toolMessages = outputMessages.filter(isToolMessage);
  const toolResults = toolMessages.map((message) => ({
    tool: message.name ?? message.tool_call_id ?? "tool",
    result: message.content,
  }));
  const aiMessage = [...outputMessages].reverse().find(isAIMessage);

  if (conversationId) {
    const serializedOutput = outputMessages.map(serializeMessage);
    const storedMessages =
      serializedOutput.length >= contextMessages.length
        ? serializedOutput.map(toConversationMessage)
        : [...contextMessages, ...serializedOutput.map(toConversationMessage)];
    const nextTitle =
      conversation?.title === "新对话" ? getTitleFromMessages(storedMessages) : undefined;
    await replaceConversationMessages(token, conversationId, storedMessages, nextTitle);
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

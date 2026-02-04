import { useCallback } from "react";
import type { MutableRefObject } from "react";
import type { LangChainMessage, LangGraphMessagesEvent, LangGraphStreamCallback } from "@assistant-ui/react-langgraph";
import type { Conversation } from "../../../types/conversation";
import { withAuthHeaders } from "../../../utils/auth/client";

type AgentMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  id?: string;
  name?: string;
  tool_call_id?: string;
};

type UseAgentStreamOptions = {
  token: string;
  historyRef: MutableRefObject<LangChainMessage[]>;
  activeConversation: Conversation | null;
  ensureConversation: () => Promise<Conversation | null>;
  updateConversationTitle: (id: string, title: string) => void;
  setActiveConversation: (conversation: Conversation | null) => void;
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const toAgentMessage = (message: LangChainMessage): AgentMessage => {
  switch (message.type) {
    case "human":
      return { role: "user", content: message.content, id: message.id };
    case "ai":
      return { role: "assistant", content: message.content, id: message.id };
    case "system":
      return { role: "system", content: message.content, id: message.id };
    case "tool":
      return {
        role: "tool",
        content: message.content,
        id: message.id,
        name: message.name,
        tool_call_id: message.tool_call_id,
      };
    default: {
      const _exhaustiveCheck: never = message;
      throw new Error(`Unknown message type: ${_exhaustiveCheck}`);
    }
  }
};

const isLangChainMessage = (value: unknown): value is LangChainMessage => {
  if (!value || typeof value !== "object") return false;
  const record = value as { type?: string };
  return (
    record.type === "ai" ||
    record.type === "human" ||
    record.type === "system" ||
    record.type === "tool"
  );
};

const normalizeToolCallChunks = (chunks: unknown) => {
  if (!Array.isArray(chunks)) return undefined;
  return chunks.map((chunk, index) => {
    const record = chunk as { index?: number };
    return {
      ...(chunk ?? {}),
      index: typeof record.index === "number" ? record.index : index + 1,
    };
  });
};

const normalizeLangChainMessage = (
  value: unknown
): LangChainMessage | { type: "AIMessageChunk"; [key: string]: unknown } | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;

  if (typeof record.type === "string") {
    if (
      record.type === "AIMessageChunk" ||
      record.type === "ai" ||
      record.type === "human" ||
      record.type === "system" ||
      record.type === "tool"
    ) {
      if (record.type === "AIMessageChunk") {
        return {
          ...record,
          tool_call_chunks: normalizeToolCallChunks(record.tool_call_chunks),
        } as { type: "AIMessageChunk" };
      }
      return record as LangChainMessage;
    }
  }

  if (record.lc === 1 && record.type === "constructor" && Array.isArray(record.id)) {
    const kind = record.id[record.id.length - 1];
    const kwargs = (record.kwargs ?? {}) as Record<string, unknown>;

    if (kind === "AIMessageChunk") {
      return {
        type: "AIMessageChunk",
        id: kwargs.id,
        content: kwargs.content,
        tool_call_chunks: normalizeToolCallChunks(kwargs.tool_call_chunks),
      };
    }
    if (kind === "AIMessage") {
      return {
        type: "ai",
        id: kwargs.id,
        content: kwargs.content,
        tool_calls: kwargs.tool_calls,
        tool_call_chunks: normalizeToolCallChunks(kwargs.tool_call_chunks),
        status: kwargs.status,
        additional_kwargs: kwargs.additional_kwargs,
      } as LangChainMessage;
    }
    if (kind === "HumanMessage") {
      return { type: "human", id: kwargs.id, content: kwargs.content } as LangChainMessage;
    }
    if (kind === "SystemMessage") {
      return { type: "system", id: kwargs.id, content: kwargs.content } as LangChainMessage;
    }
    if (kind === "ToolMessage") {
      return {
        type: "tool",
        id: kwargs.id,
        content: kwargs.content,
        tool_call_id: kwargs.tool_call_id,
        name: kwargs.name,
        status: kwargs.status ?? "success",
        artifact: kwargs.artifact,
      } as LangChainMessage;
    }
  }

  return null;
};

const normalizeMessagesPayload = (payload: unknown): LangChainMessage[] => {
  if (Array.isArray(payload)) {
    return payload
      .map(normalizeLangChainMessage)
      .filter((message): message is LangChainMessage => !!message && isLangChainMessage(message));
  }
  const normalized = normalizeLangChainMessage(payload);
  if (normalized && isLangChainMessage(normalized)) {
    return [normalized];
  }
  return [];
};

const isLangChainMessageChunk = (value: unknown): value is { type: "AIMessageChunk" } => {
  const normalized = normalizeLangChainMessage(value);
  if (!normalized || typeof normalized !== "object") return false;
  const chunk = normalized as { type?: string; content?: unknown; tool_call_chunks?: unknown };
  const contentOk =
    chunk.content === undefined ||
    typeof chunk.content === "string" ||
    Array.isArray(chunk.content);
  const toolChunksOk =
    chunk.tool_call_chunks === undefined || Array.isArray(chunk.tool_call_chunks);
  return chunk.type === "AIMessageChunk" && contentOk && toolChunksOk;
};

export function useAgentStream({
  token,
  historyRef,
  activeConversation,
  ensureConversation,
  updateConversationTitle,
  setActiveConversation,
}: UseAgentStreamOptions): { stream: LangGraphStreamCallback<LangChainMessage> } {
  const stream = useCallback<LangGraphStreamCallback<LangChainMessage>>(
    async function* (newMessages, { abortSignal, initialize }) {
      let sawChunk = false;
      const systemEvent = (text: string): LangGraphMessagesEvent<LangChainMessage> => ({
        event: "messages/complete",
        data: [
          {
            id: createId(),
            type: "system",
            content: text,
          },
        ],
      });

      if (!token) {
        yield systemEvent("缺少 token，无法发送消息。");
        return;
      }

      try {
        await initialize();
      } catch (error) {
        console.warn("Failed to initialize thread:", error);
      }

      historyRef.current = [...historyRef.current, ...newMessages];
      const lastUser = [...newMessages].reverse().find((message) => message.type === "human");
      const rawContent = lastUser?.content;
      const title =
        typeof rawContent === "string"
          ? rawContent.trim()
          : Array.isArray(rawContent)
          ? rawContent
              .map((item) =>
                typeof item === "string" ? item : (item as { text?: string })?.text ?? ""
              )
              .join("")
              .trim()
          : "";
      if (title && activeConversation?.id) {
        const trimmed = title.length > 40 ? `${title.slice(0, 40)}...` : title;
        updateConversationTitle(activeConversation.id, trimmed);
      }
      const payloadMessages = newMessages.map(toAgentMessage);
      let conversationId = activeConversation?.id;
      if (!conversationId) {
        const created = await ensureConversation();
        if (!created) {
          yield systemEvent("缺少对话 ID，请稍后重试。");
          return;
        }
        setActiveConversation(created);
        conversationId = created.id;
      }
      let response: Response;
      try {
        response = await fetch(`/api/agent?token=${encodeURIComponent(token)}&stream=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...withAuthHeaders() },
          body: JSON.stringify({
            token,
            messages: payloadMessages,
            stream: true,
            conversationId,
          }),
          signal: abortSignal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const message = error instanceof Error ? error.message : "请求失败，请稍后重试。";
        yield systemEvent(message);
        return;
      }

      if (!response.ok) {
        const payload = (await response
          .json()
          .catch(() => null)) as { error?: string; message?: string } | null;
        const message = payload?.error || payload?.message || `请求失败 (${response.status})`;
        yield systemEvent(message);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        const payload = (await response
          .json()
          .catch(() => null)) as
          | { message?: string; updatedFiles?: Record<string, { code: string }> }
          | null;
        const messageText = payload?.message ?? "";
        if (messageText) {
          const finalMessage: LangChainMessage = {
            id: createId(),
            type: "ai",
            content: messageText,
          };
          historyRef.current = [...historyRef.current, finalMessage];
          yield { event: "messages/complete", data: [finalMessage] };
        }
        if (payload?.updatedFiles) {
          yield { event: "files", data: payload.updatedFiles };
        }
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (!value) {
          continue;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const lines = part.split("\n");
          let eventName = "message";
          const dataLines: string[] = [];

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              dataLines.push(line.replace("data:", "").trim());
            }
          }

          const dataLine = dataLines.join("\n");
          if (!dataLine) continue;

          let payload: unknown;
          try {
            payload = JSON.parse(dataLine);
          } catch (error) {
            console.warn("Failed to parse stream payload:", error);
            continue;
          }

          if (eventName === "updates") {
            const update = payload as { messages?: LangChainMessage[] };
            if (Array.isArray(update?.messages)) {
              historyRef.current = normalizeMessagesPayload(update.messages);
            }
          }
          if (eventName === "error") {
            const record = payload as { error?: string; message?: string } | null;
            const errorText =
              (record?.error || record?.message || "请求失败")?.toString() ?? "请求失败";
            const errorMessage: LangChainMessage = {
              id: createId(),
              type: "system",
              content: `出错了：${errorText}`,
            };
            historyRef.current = [...historyRef.current, errorMessage];
            yield { event: "messages/complete", data: [errorMessage] };
            continue;
          }
          if (eventName === "messages/complete") {
            const complete = normalizeMessagesPayload(payload);
            if (complete.length > 0) {
              historyRef.current = [...historyRef.current, ...complete];
            }
          }

          if (eventName === "done") {
            done = true;
            continue;
          }

          if (eventName === "messages/complete" || eventName === "messages/partial") {
            const complete = normalizeMessagesPayload(payload);
            if (complete.length === 0) {
              if (Array.isArray(payload) && isLangChainMessageChunk(payload[0])) {
                const normalizedChunk = normalizeLangChainMessage(payload[0]);
                if (normalizedChunk && typeof normalizedChunk === "object") {
                  yield {
                    event: "messages",
                    data: [normalizedChunk, payload[1]],
                  } as LangGraphMessagesEvent<LangChainMessage>;
                }
              }
              continue;
            }
            const nextComplete = sawChunk
              ? complete.filter((message) => message.type !== "ai")
              : complete;
            if (nextComplete.length === 0) continue;
            yield {
              event: eventName as LangGraphMessagesEvent<LangChainMessage>["event"],
              data: nextComplete,
            } as LangGraphMessagesEvent<LangChainMessage>;
            continue;
          }
          if (eventName === "messages") {
            if (!Array.isArray(payload) || !isLangChainMessageChunk(payload[0])) {
              console.warn("Invalid messages payload, skipped:", payload);
              continue;
            }
            sawChunk = true;
            const normalizedChunk = normalizeLangChainMessage(payload[0]);
            if (normalizedChunk && typeof normalizedChunk === "object") {
              payload = [normalizedChunk, payload[1]] as unknown;
            }
          }
          if (eventName === "updates") {
            const update = payload as { messages?: LangChainMessage[] };
            if (Array.isArray(update?.messages)) {
              update.messages = normalizeMessagesPayload(update.messages);
            }
          }
          yield {
            event: eventName as LangGraphMessagesEvent<LangChainMessage>["event"],
            data: payload,
          } as LangGraphMessagesEvent<LangChainMessage>;
        }
      }
    },
    [
      activeConversation,
      ensureConversation,
      historyRef,
      setActiveConversation,
      token,
      updateConversationTitle,
    ]
  );

  return { stream };
}

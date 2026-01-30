import type {
  BaseMessage,
  MessageContent,
  MessageContentComplex,
  ToolCall,
  ToolCallChunk,
} from "@langchain/core/messages";
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

type IncomingMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  id?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  tool_call_chunks?: ToolCallChunk[];
  additional_kwargs?: Record<string, unknown>;
  status?: "success" | "error";
  artifact?: unknown;
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

export function toBaseMessage(message: IncomingMessage): BaseMessage {
  const content = normalizeMessageContent(message.content ?? "");
  if (message.role === "assistant") {
    return new AIMessage({
      content,
      additional_kwargs: message.additional_kwargs,
      tool_calls: message.tool_calls,
    });
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

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item === "string" ? item : (item as { text?: string })?.text ?? ""))
      .join("");
  }
  if (content && typeof content === "object" && "text" in content) {
    return String((content as { text?: string }).text ?? "");
  }
  return "";
}

export type LangChainMessageShape = {
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

export type LangChainMessageChunkShape = {
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

const normalizeToolCallChunks = (chunks: unknown): ToolCallChunk[] | undefined => {
  if (!Array.isArray(chunks)) return undefined;
  return chunks.map((chunk, index) => ({
    ...(chunk ?? {}),
    index: typeof (chunk as ToolCallChunk).index === "number" ? (chunk as ToolCallChunk).index : index + 1,
  })) as ToolCallChunk[];
};

export const serializeMessage = (message: BaseMessage): LangChainMessageShape => {
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
      tool_call_chunks: normalizeToolCallChunks(aiMessage.tool_call_chunks),
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

export const serializeMessageChunk = (
  chunk: unknown
): LangChainMessageChunkShape | null => {
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
    tool_call_chunks: normalizeToolCallChunks(chunkRecord.tool_call_chunks),
  };
};

export const normalizeLangChainMessage = (
  value: unknown
): LangChainMessageShape | LangChainMessageChunkShape | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, any>;

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

export const extractNestedMessages = (
  payload: unknown
): Array<LangChainMessageShape | LangChainMessageChunkShape> => {
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

export type { IncomingMessage };

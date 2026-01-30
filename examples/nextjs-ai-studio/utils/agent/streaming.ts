import type { BaseMessage } from "@langchain/core/messages";
import {
  extractNestedMessages,
  serializeMessage,
  serializeMessageChunk,
  type LangChainMessageShape,
} from "./messageSerialization";

type SendEvent = (event: string, data: unknown) => void;
type StreamCollector = {
  onStateMessages?: (messages: LangChainMessageShape[]) => void;
  onCompleteMessages?: (messages: LangChainMessageShape[]) => void;
};

type StreamStatePayload = {
  messages?: BaseMessage[];
  [key: string]: unknown;
};

const isTupleLike = (chunk: unknown): chunk is [unknown, unknown] =>
  Array.isArray(chunk) ||
  (typeof chunk === "object" &&
    chunk !== null &&
    "0" in chunk &&
    "1" in chunk &&
    Object.keys(chunk as Record<string, unknown>).length === 2);

const handleStreamEntry = (
  mode: string,
  payload: unknown,
  sendEvent: SendEvent,
  collector?: StreamCollector
) => {
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
    const state = payload as StreamStatePayload;
    if (Array.isArray(state.messages)) {
      const serializedMessages = state.messages.map(serializeMessage);
      sendEvent("updates", {
        ...state,
        messages: serializedMessages,
      });
      collector?.onStateMessages?.(serializedMessages);
    } else {
      const nestedMessages = extractNestedMessages(payload);
      const completeMessages = nestedMessages.filter(
        (message) => message.type !== "AIMessageChunk"
      );
      if (completeMessages.length > 0) {
        sendEvent("messages/complete", completeMessages);
        collector?.onCompleteMessages?.(completeMessages);
      }
      sendEvent("updates", state);
    }
    return;
  }

  sendEvent(mode, payload);
};

export async function consumeAgentStream(
  stream: AsyncIterable<unknown>,
  sendEvent: SendEvent,
  collector?: StreamCollector
) {
  for await (const chunk of stream) {
    if (!chunk) continue;

    const isBinaryChunk =
      typeof chunk === "object" && chunk !== null && ArrayBuffer.isView(chunk);
    if (isBinaryChunk) {
      continue;
    }

    if (isTupleLike(chunk)) {
      const tuple = Array.isArray(chunk)
        ? chunk
        : [
            (chunk as Record<string, unknown>)[0],
            (chunk as Record<string, unknown>)[1],
          ];
      handleStreamEntry(String(tuple[0]), tuple[1], sendEvent, collector);
      continue;
    }

    if (typeof chunk === "object") {
      const record = chunk as Record<string, unknown>;
      if ("event" in record && "data" in record) {
        handleStreamEntry(String(record.event), record.data, sendEvent, collector);
        continue;
      }
      for (const [mode, payload] of Object.entries(record)) {
        handleStreamEntry(mode, payload, sendEvent, collector);
      }
    }
  }
}

export function createSseHelpers(
  res: {
    write: (chunk: string) => void;
    setHeader: (name: string, value: string) => void;
    flushHeaders?: () => void;
    statusCode: number;
  }
) {
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

  return { sendEvent, startStream };
}

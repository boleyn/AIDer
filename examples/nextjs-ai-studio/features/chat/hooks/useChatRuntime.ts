import { useMemo, useState } from "react";
import {
  type AttachmentAdapter,
  type FeedbackAdapter,
  type SpeechSynthesisAdapter,
  useExternalMessageConverter,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import {
  appendLangChainChunk,
  convertLangChainMessages,
  type LangChainMessage,
  type LangChainToolCall,
  type LangGraphInterruptState,
  type LangGraphSendMessageConfig,
  type LangGraphStreamCallback,
  useLangGraphMessages,
} from "@assistant-ui/react-langgraph";
import type { AppendMessage } from "@assistant-ui/react";

type UseChatRuntimeOptions = {
  autoCancelPendingToolCalls?: boolean;
  unstable_allowCancellation?: boolean;
  stream: LangGraphStreamCallback<LangChainMessage>;
  eventHandlers?: {
    onMetadata?: (metadata: unknown) => void;
    onInfo?: (info: unknown) => void;
    onError?: (error: unknown) => void;
    onCustomEvent?: (event: string, data: unknown) => void;
  };
  adapters?: {
    attachments?: AttachmentAdapter;
    speech?: SpeechSynthesisAdapter;
    feedback?: FeedbackAdapter;
  };
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const ensureUniqueMessageIds = (messages: LangChainMessage[]) => {
  const seen = new Set<string>();
  return messages.map((message) => {
    const baseId = message.id ?? createId();
    if (seen.has(baseId)) {
      const nextId = createId();
      seen.add(nextId);
      return { ...message, id: nextId };
    }
    seen.add(baseId);
    return message.id ? message : { ...message, id: baseId };
  });
};

const getPendingToolCalls = (messages: LangChainMessage[]) => {
  const pendingToolCalls = new Map<string, LangChainToolCall>();
  for (const message of messages) {
    if (message.type === "ai") {
      for (const toolCall of message.tool_calls ?? []) {
        pendingToolCalls.set(toolCall.id, toolCall);
      }
    }
    if (message.type === "tool") {
      pendingToolCalls.delete(message.tool_call_id);
    }
  }

  return [...pendingToolCalls.values()];
};

const getMessageContent = (msg: AppendMessage) => {
  const allContent = [
    ...msg.content,
    ...(msg.attachments?.flatMap((a) => a.content) ?? []),
  ];
  const content = allContent.map((part) => {
    const type = part.type;
    switch (type) {
      case "text":
        return { type: "text" as const, text: part.text };
      case "image":
        return { type: "image_url" as const, image_url: { url: part.image } };
      case "file":
        return {
          type: "file" as const,
          file: {
            filename: part.filename ?? "file",
            file_data: part.data,
            mime_type: part.mimeType,
          },
        };
      case "tool-call":
        throw new Error("Tool call appends are not supported.");
      default: {
        const _exhaustiveCheck: "reasoning" | "source" | "audio" | "data" = type;
        throw new Error(`Unsupported append message part type: ${_exhaustiveCheck}`);
      }
    }
  });

  if (content.length === 1 && content[0]?.type === "text") {
    return content[0].text ?? "";
  }

  return content;
};

export function useChatRuntime({
  autoCancelPendingToolCalls,
  unstable_allowCancellation,
  stream,
  eventHandlers,
  adapters,
}: UseChatRuntimeOptions): {
  runtime: ReturnType<typeof useExternalStoreRuntime>;
  setMessages: (messages: LangChainMessage[]) => void;
  interrupt: LangGraphInterruptState | undefined;
  setInterrupt: (value: LangGraphInterruptState | undefined) => void;
} {
  const {
    interrupt,
    setInterrupt,
    messages,
    sendMessage,
    cancel,
    setMessages,
  } = useLangGraphMessages({
    appendMessage: appendLangChainChunk,
    stream,
    ...(eventHandlers && { eventHandlers }),
  });

  const [isRunning, setIsRunning] = useState(false);

  const sanitizedMessages = useMemo(
    () => ensureUniqueMessageIds(messages),
    [messages],
  );

  const handleSendMessage = async (
    nextMessages: LangChainMessage[],
    config: LangGraphSendMessageConfig,
  ) => {
    try {
      setIsRunning(true);
      await sendMessage(nextMessages, config);
    } finally {
      setIsRunning(false);
    }
  };

  const threadMessages = useExternalMessageConverter({
    callback: convertLangChainMessages,
    messages: sanitizedMessages,
    isRunning,
  });

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages: threadMessages,
    adapters,
    extras: {
      interrupt,
    },
    onNew: async (msg) => {
      const cancellations =
        autoCancelPendingToolCalls !== false
          ? getPendingToolCalls(messages).map((t) => ({
              type: "tool",
              name: t.name,
              tool_call_id: t.id,
              content: JSON.stringify({ cancelled: true }),
              status: "error",
            }))
          : [];

      await handleSendMessage(
        [
          ...cancellations,
          {
            type: "human",
            content: getMessageContent(msg),
          },
        ],
        {
          runConfig: msg.runConfig,
        },
      );
    },
    onAddToolResult: async ({
      toolCallId,
      toolName,
      result,
      isError,
      artifact,
    }) => {
      await handleSendMessage(
        [
          {
            type: "tool",
            name: toolName,
            tool_call_id: toolCallId,
            content: JSON.stringify(result),
            artifact,
            status: isError ? "error" : "success",
          },
        ],
        {},
      );
    },
    onCancel: unstable_allowCancellation
      ? async () => {
          cancel();
        }
      : undefined,
  });

  return {
    runtime,
    setMessages,
    interrupt,
    setInterrupt,
  };
}

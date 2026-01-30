import { Box, Flex, Text } from "@chakra-ui/react";
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useRef } from "react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  type TextMessagePartComponent,
} from "@assistant-ui/react";
import {
  useLangGraphRuntime,
  type LangChainMessage,
  type LangGraphMessagesEvent,
  type LangGraphStreamCallback,
} from "@assistant-ui/react-langgraph";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

import ChatComposerBar from "./chat/ChatComposerBar";
import ChatMessagesSection from "./chat/ChatMessagesSection";
import ChatTitleSection from "./chat/ChatTitleSection";
import { ToolCallCard } from "./chat/ToolCallCard";

type ChatPanelProps = {
  token: string;
  onFilesUpdated?: (files: Record<string, { code: string }>) => void;
  height?: string;
};

type AgentMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  name?: string;
  tool_call_id?: string;
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

const initialAssistantMessage =
  "你好！我可以帮你编写和修改代码。你也可以使用 /global 指令查看文件，比如：/global list 或 /global {\"action\":\"read\",\"path\":\"/App.js\"}";

const roleStyles = {
  user: {
    bg: "white",
    borderColor: "gray.200",
  },
  assistant: {
    bg: "gray.50",
    borderColor: "gray.200",
  },
  system: {
    bg: "blue.50",
    borderColor: "blue.100",
  },
} as const;

const MarkdownText: TextMessagePartComponent = () => (
  <MarkdownTextPrimitive className="assistant-markdown" />
);

const ToolGroup = ({ children }: { children: ReactNode }) => (
  <Box className="assistant-tool-group">{children}</Box>
);

const messagePartsComponents = {
  Text: MarkdownText,
  tools: {
    Override: ToolCallCard,
  },
  ToolGroup,
} as const;

const toAgentMessage = (message: LangChainMessage): AgentMessage => {
  switch (message.type) {
    case "human":
      return { role: "user", content: message.content };
    case "ai":
      return { role: "assistant", content: message.content };
    case "system":
      return { role: "system", content: message.content };
    case "tool":
      return {
        role: "tool",
        content: message.content,
        name: message.name,
        tool_call_id: message.tool_call_id,
      };
    default: {
      const _exhaustiveCheck: never = message;
      throw new Error(`Unknown message type: ${_exhaustiveCheck}`);
    }
  }
};

const MessageBubble = ({ role, children }: { role: "user" | "assistant" | "system"; children: ReactNode }) => {
  const styles = roleStyles[role];

  return (
    <Box
      border="1px solid"
      borderColor={styles.borderColor}
      borderRadius="lg"
      bg={styles.bg}
      p={3}
      fontSize="sm"
      color="gray.700"
      lineHeight="1.6"
    >
      {children}
    </Box>
  );
};

const UserMessage = () => (
  <MessagePrimitive.Root className="assistant-message">
    <Flex justify="flex-end">
      <Box className="assistant-bubble">
        <MessageBubble role="user">
          <MessagePrimitive.Parts components={messagePartsComponents} />
        </MessageBubble>
      </Box>
    </Flex>
  </MessagePrimitive.Root>
);

const AssistantMessage = () => (
  <MessagePrimitive.Root className="assistant-message">
    <Flex justify="flex-start">
      <Box className="assistant-bubble">
        <MessageBubble role="assistant">
          <MessagePrimitive.Parts components={messagePartsComponents} />
          <MessagePrimitive.Error>
            <Text mt={2} fontSize="xs" color="red.500">
              生成失败，请重试。
            </Text>
          </MessagePrimitive.Error>
        </MessageBubble>
      </Box>
    </Flex>
  </MessagePrimitive.Root>
);

const SystemMessage = () => (
  <MessagePrimitive.Root className="assistant-message">
    <Flex justify="center">
      <Box className="assistant-bubble">
        <MessageBubble role="system">
          <MessagePrimitive.Parts components={messagePartsComponents} />
        </MessageBubble>
      </Box>
    </Flex>
  </MessagePrimitive.Root>
);

const threadMessageComponents = {
  UserMessage,
  AssistantMessage,
  SystemMessage,
} as const;

const AssistantThread = ({ onReset }: { onReset: () => void }) => (
  <ThreadPrimitive.Root className="assistant-thread">
    <ChatTitleSection onReset={onReset} />
    <ChatMessagesSection components={threadMessageComponents} />
    <ChatComposerBar />
  </ThreadPrimitive.Root>
);

type ChatPanelBodyProps = {
  token: string;
  historyRef: MutableRefObject<LangChainMessage[]>;
};

const ChatPanelBody = ({ token, historyRef }: ChatPanelBodyProps) => {
  const aui = useAui();

  const resetThread = useCallback(() => {
    aui.thread().reset([{ role: "assistant", content: initialAssistantMessage }]);
    historyRef.current = [
      {
        type: "ai",
        content: initialAssistantMessage,
      },
    ];
  }, [aui, historyRef]);

  useEffect(() => {
    resetThread();
  }, [resetThread, token]);

  return <AssistantThread onReset={resetThread} />;
};

const ChatPanel = ({ token, onFilesUpdated, height = "100%" }: ChatPanelProps) => {
  const historyRef = useRef<LangChainMessage[]>([]);

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

    if (
      record.lc === 1 &&
      record.type === "constructor" &&
      Array.isArray(record.id)
    ) {
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

  const stream = useCallback<LangGraphStreamCallback<LangChainMessage>>(
    async function* (newMessages, { abortSignal, initialize }) {
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
      const payloadMessages = historyRef.current.map(toAgentMessage);
      let response: Response;
      try {
        response = await fetch(
          `/api/agent?token=${encodeURIComponent(token)}&stream=1`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              messages: payloadMessages,
              stream: true,
            }),
            signal: abortSignal,
          }
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const message =
          error instanceof Error ? error.message : "请求失败，请稍后重试。";
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
            yield {
              event: eventName as LangGraphMessagesEvent<LangChainMessage>["event"],
              data: complete,
            } as LangGraphMessagesEvent<LangChainMessage>;
            continue;
          }
          if (eventName === "messages") {
            if (!Array.isArray(payload) || !isLangChainMessageChunk(payload[0])) {
              console.warn("Invalid messages payload, skipped:", payload);
              continue;
            }
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
    [token]
  );

  const runtime = useLangGraphRuntime({
    stream,
    eventHandlers: {
      onCustomEvent: (event, data) => {
        if (event === "files" && onFilesUpdated) {
          onFilesUpdated(data as Record<string, { code: string }>);
        }
      },
    },
  });

  return (
    <Flex
      as="aside"
      direction="column"
      h={height}
      minW="280px"
      w="32%"
      maxW="420px"
      flex="0 0 auto"
      minH="0"
      overflow="hidden"
      alignSelf="stretch"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      bg="whiteAlpha.900"
      boxShadow="sm"
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <ChatPanelBody token={token} historyRef={historyRef} />
      </AssistantRuntimeProvider>
    </Flex>
  );
};

export default ChatPanel;

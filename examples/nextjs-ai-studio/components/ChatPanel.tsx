import { Box, Flex, Text } from "@chakra-ui/react";
import { type MutableRefObject, type ReactNode, useCallback, useEffect, useRef } from "react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
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

import ChatHeader from "./chat/ChatHeader";

type ChatPanelProps = {
  token: string;
  onFilesUpdated?: (files: Record<string, { code: string }>) => void;
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

const messageContentComponents = {
  Text: MarkdownText,
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
          <MessagePrimitive.Content components={messageContentComponents} />
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
          <MessagePrimitive.Content components={messageContentComponents} />
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
          <MessagePrimitive.Content components={messageContentComponents} />
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

const AssistantThread = () => (
  <ThreadPrimitive.Root className="assistant-thread">
    <ThreadPrimitive.Viewport className="assistant-viewport" autoScroll>
      <ThreadPrimitive.Messages components={threadMessageComponents} />
      <ThreadPrimitive.ViewportFooter className="assistant-footer">
        <ComposerPrimitive.Root className="assistant-composer">
          <ComposerPrimitive.Input
            className="assistant-input"
            placeholder="描述你想改的地方，或直接提出需求..."
          />
          <ComposerPrimitive.Send className="assistant-send">发送</ComposerPrimitive.Send>
        </ComposerPrimitive.Root>
      </ThreadPrimitive.ViewportFooter>
    </ThreadPrimitive.Viewport>
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

  return (
    <>
      <ChatHeader onReset={resetThread} />
      <AssistantThread />
    </>
  );
};

const ChatPanel = ({ token, onFilesUpdated }: ChatPanelProps) => {
  const historyRef = useRef<LangChainMessage[]>([]);

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
              historyRef.current = update.messages;
            }
          }
          if (eventName === "messages/complete") {
            const complete = payload as LangChainMessage[];
            if (Array.isArray(complete)) {
              historyRef.current = [...historyRef.current, ...complete];
            }
          }

          if (eventName === "done") {
            done = true;
            continue;
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
      minW="280px"
      w="32%"
      maxW="420px"
      flex="0 0 auto"
      minH="0"
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

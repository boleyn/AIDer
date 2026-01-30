import { Box, Flex, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import {
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  AssistantRuntimeProvider,
  MessagePrimitive,
  ThreadPrimitive,
  useAui,
  type TextMessagePartComponent,
} from "@assistant-ui/react";
import { useLangGraphRuntime, type LangChainMessage } from "@assistant-ui/react-langgraph";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

import ChatComposerBar from "./ChatComposerBar";
import ChatMessagesSection from "./ChatMessagesSection";
import ChatTitleSection from "./ChatTitleSection";
import { ToolCallCard } from "./ToolCallCard";
import type { Conversation, ConversationMessage, ConversationSummary } from "../../../types/conversation";
import { useConversations } from "../hooks/useConversations";
import { useAgentStream } from "../hooks/useAgentStream";
import { INITIAL_ASSISTANT_MESSAGE } from "../utils/constants";

type ChatPanelProps = {
  token: string;
  onFilesUpdated?: (files: Record<string, { code: string }>) => void;
  height?: string;
};

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random()}`;
};

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

const normalizeStoredContent = (content: unknown): unknown => {
  if (typeof content === "string" || Array.isArray(content)) return content;
  if (content && typeof content === "object" && "text" in content) {
    const text = (content as { text?: unknown }).text;
    if (typeof text === "string") return text;
    if (text != null) return String(text);
  }
  if (content == null) return "";
  return String(content);
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
            <Text fontSize="sm" color="red.500">
              回复失败，请重试。
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

const AssistantThread = ({
  onReset,
  onNewConversation,
  conversations,
  activeConversationId,
  onSelectConversation,
  title,
}: {
  onReset: () => void;
  onNewConversation?: () => void;
  conversations?: ConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  title?: string;
}) => (
  <ThreadPrimitive.Root className="assistant-thread">
    <ChatTitleSection
      onReset={onReset}
      onNewConversation={onNewConversation}
      conversations={conversations}
      activeConversationId={activeConversationId}
      onSelectConversation={onSelectConversation}
      title={title}
    />
    <ChatMessagesSection components={threadMessageComponents} />
    <ChatComposerBar />
  </ThreadPrimitive.Root>
);

type ChatPanelBodyProps = {
  token: string;
  historyRef: MutableRefObject<LangChainMessage[]>;
  conversations: ConversationSummary[];
  activeConversation: Conversation | null;
  isLoadingConversation: boolean;
  isInitialized: boolean;
  onReset: () => void;
  onNewConversation: () => void;
  onSelectConversation: (id: string) => void;
};

const ChatPanelBody = ({
  token,
  historyRef,
  conversations,
  activeConversation,
  isLoadingConversation,
  isInitialized,
  onReset,
  onNewConversation,
  onSelectConversation,
}: ChatPanelBodyProps) => {
  const aui = useAui();

  const toThreadMessage = useCallback((message: ConversationMessage) => {
    if (message.role === "tool") return null;
    return {
      role: message.role,
      content: normalizeStoredContent(message.content),
    } as { role: "user" | "assistant" | "system"; content: unknown };
  }, []);

  const toLangChainMessage = useCallback(
    (message: ConversationMessage): LangChainMessage => {
      if (message.role === "user") {
        return {
          type: "human",
          id: createId(),
          content: normalizeStoredContent(message.content),
        } as LangChainMessage;
      }
      if (message.role === "assistant") {
        return {
          type: "ai",
          id: createId(),
          content: normalizeStoredContent(message.content),
        } as LangChainMessage;
      }
      if (message.role === "system") {
        return {
          type: "system",
          id: createId(),
          content: normalizeStoredContent(message.content),
        } as LangChainMessage;
      }
      return {
        type: "tool",
        id: createId(),
        content: normalizeStoredContent(message.content),
        name: message.name,
        tool_call_id: message.tool_call_id,
      } as LangChainMessage;
    },
    []
  );

  const resetThreadWithMessages = useCallback(
    (messages: ConversationMessage[]) => {
      const threadMessages = messages
        .map(toThreadMessage)
        .filter((message): message is { role: "user" | "assistant" | "system"; content: unknown } =>
          Boolean(message)
        );

      if (threadMessages.length === 0) {
        aui.thread().reset([{ role: "assistant", content: INITIAL_ASSISTANT_MESSAGE }]);
        historyRef.current = [
          {
            type: "ai",
            content: INITIAL_ASSISTANT_MESSAGE,
          },
        ];
        return;
      }

      aui.thread().reset(threadMessages);
      historyRef.current = messages.map(toLangChainMessage);
    },
    [aui, historyRef, toLangChainMessage, toThreadMessage]
  );

  useEffect(() => {
    if (!token) return;
    if (isLoadingConversation) return;
    if (!isInitialized) return;
    if (activeConversation) {
      resetThreadWithMessages(activeConversation.messages);
      return;
    }
    onReset();
  }, [
    activeConversation,
    isInitialized,
    isLoadingConversation,
    onReset,
    resetThreadWithMessages,
    token,
  ]);

  return (
    <AssistantThread
      onReset={onReset}
      conversations={conversations}
      activeConversationId={activeConversation?.id ?? null}
      onSelectConversation={onSelectConversation}
      onNewConversation={onNewConversation}
      title={activeConversation?.title}
    />
  );
};

const ChatPanel = ({ token, onFilesUpdated, height = "100%" }: ChatPanelProps) => {
  const historyRef = useRef<LangChainMessage[]>([]);
  const router = useRouter();
  const {
    conversations,
    activeConversation,
    isLoadingConversation,
    isInitialized,
    loadConversation,
    createNewConversation,
    ensureConversation,
    updateConversationTitle,
    setActiveConversation,
  } = useConversations(token, router);

  const { stream } = useAgentStream({
    token,
    historyRef,
    activeConversation,
    ensureConversation,
    updateConversationTitle,
    setActiveConversation,
  });

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
        <ChatPanelBody
          token={token}
          historyRef={historyRef}
          conversations={conversations}
          activeConversation={activeConversation}
          isLoadingConversation={isLoadingConversation}
          isInitialized={isInitialized}
          onReset={createNewConversation}
          onNewConversation={createNewConversation}
          onSelectConversation={loadConversation}
        />
      </AssistantRuntimeProvider>
    </Flex>
  );
};

export default ChatPanel;

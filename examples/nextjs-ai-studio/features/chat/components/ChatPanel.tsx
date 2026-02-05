import { Box, Button, Flex, IconButton, Input, Spinner, Text } from "@chakra-ui/react";
import Markdown from "../../../components/Markdown/Markdown";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import type { Conversation, ConversationMessage } from "../../../types/conversation";
import { useConversations } from "../hooks/useConversations";
import { createId, extractText } from "../../../utils/agent/messages";

const normalizeContent = (content: unknown) => {
  const text = extractText(content);
  return text.trim() ? text : "";
};

const MessageBubble = ({ role, content }: { role: ConversationMessage["role"]; content: string }) => {
  const isUser = role === "user";
  const isTool = role === "tool";
  const bg = isUser ? "white" : isTool ? "gray.100" : "gray.50";
  const borderColor = isUser ? "gray.200" : isTool ? "orange.200" : "gray.200";
  const align = isUser ? "flex-end" : "flex-start";

  return (
    <Flex justify={align} w="full">
      <Box
        maxW="85%"
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        bg={bg}
        px={4}
        py={3}
        fontSize="sm"
        color="gray.700"
      >
        {role === "assistant" ? <Markdown content={content || ""} /> : content || ""}
      </Box>
    </Flex>
  );
};

const ToolBadge = ({ name }: { name?: string }) => (
  <Text fontSize="xs" color="orange.600" mb={1} fontWeight="600">
    {name ? `工具: ${name}` : "工具"}
  </Text>
);

const ChatPanel = ({ token, onFilesUpdated, height = "100%" }: { token: string; onFilesUpdated?: (files: Record<string, { code: string }>) => void; height?: string; }) => {
  const router = useRouter();
  const {
    conversations,
    activeConversation,
    isLoadingConversation,
    isInitialized,
    createNewConversation,
    ensureConversation,
    loadConversation,
    deleteConversation,
    deleteAllConversations,
  } = useConversations(token, router);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(activeConversation?.messages ?? []);
  }, [activeConversation?.id]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const conversation = await ensureConversation();
    if (!conversation) return;

    const userMessage: ConversationMessage = {
      role: "user",
      content: text,
      id: createId(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    const assistantMessageId = createId();
    setStreamingMessageId(assistantMessageId);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
        id: assistantMessageId,
      },
    ]);

    try {
      const response = await fetch(`/api/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          messages: [userMessage],
          stream: true,
          conversationId: conversation.id,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

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
          } catch {
            continue;
          }

          if (eventName === "message") {
            const record = payload as { content?: unknown; delta?: { content?: string } };
            const delta = normalizeContent(record.delta?.content ?? record.content ?? "");
            if (!delta) continue;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `${normalizeContent(msg.content)}${delta}` }
                  : msg
              )
            );
            continue;
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: `请求失败: ${error instanceof Error ? error.message : "未知错误"}` }
            : msg
        )
      );
    } finally {
      setStreamingMessageId(null);
      setIsSending(false);
    }
  }, [ensureConversation, input, isSending, onFilesUpdated, token]);

  const activeConversationTitle = useMemo(() => activeConversation?.title, [activeConversation?.title]);

  return (
    <Flex direction="column" h={height} bg="white" borderLeft="1px solid" borderColor="gray.200">
      <ChatHeader
        title={activeConversationTitle}
        conversations={conversations}
        activeConversationId={activeConversation?.id}
        onSelectConversation={(id) => loadConversation(id)}
        onDeleteConversation={(id) => deleteConversation(id)}
        onDeleteAllConversations={() => deleteAllConversations()}
        onNewConversation={() => createNewConversation()}
      />

      <Flex direction="column" flex="1" overflow="hidden">
        <Box ref={scrollRef} flex="1" overflowY="auto" px={4} py={4} bg="gray.50">
          {!isInitialized || isLoadingConversation ? (
            <Flex align="center" justify="center" h="full" color="gray.500" gap={2}>
              <Spinner size="sm" />
              <Text fontSize="sm">加载对话...</Text>
            </Flex>
          ) : messages.length === 0 ? (
            <Flex align="center" justify="center" h="full" color="gray.400">
              <Text fontSize="sm">开始提问吧</Text>
            </Flex>
          ) : (
            <Flex direction="column" gap={3}>
              {messages.map((message) => {
                const content = normalizeContent(message.content);
                if (!content && message.role !== "assistant") return null;
                return (
                  <Box key={message.id ?? `${message.role}-${Math.random()}`}>
                    {message.role === "tool" ? <ToolBadge name={message.name} /> : null}
                    <MessageBubble role={message.role} content={content} />
                  </Box>
                );
              })}
            </Flex>
          )}
        </Box>

        <Flex px={4} py={3} borderTop="1px solid" borderColor="gray.200" gap={2} bg="white">
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="输入你的问题..."
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            isDisabled={isSending}
          />
          <IconButton
            aria-label="Send"
            onClick={handleSend}
            colorScheme="purple"
            isLoading={isSending}
            icon={<Text fontSize="sm">发送</Text>}
          />
          {streamingMessageId ? (
            <Button variant="ghost" size="sm" isDisabled>
              生成中...
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ChatPanel;

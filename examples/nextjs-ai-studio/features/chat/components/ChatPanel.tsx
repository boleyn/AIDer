import { Box, Button, Flex, IconButton, Input, Spinner, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ChatHeader from "./ChatHeader";
import ChatItem from "./ChatItem";
import type { Conversation, ConversationMessage } from "../../../types/conversation";
import { useConversations } from "../hooks/useConversations";
import { createId, extractText } from "../../../utils/agent/messages";
import { streamFetch, SseResponseEventEnum } from "../../../utils/streamFetch";

const normalizeContent = (content: unknown) => {
  const text = extractText(content);
  return text.trim() ? text : "";
};

const normalizeStreamContent = (content: unknown) => {
  const text = extractText(content);
  return text ?? "";
};

const extractDeltaText = (payload: unknown) => {
  if (!payload || typeof payload !== "object") return "";
  const record = payload as {
    content?: unknown;
    delta?: { content?: string };
    choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
  };

  if (Array.isArray(record.choices) && record.choices.length > 0) {
    const choice = record.choices[0];
    const text = choice?.delta?.content ?? choice?.message?.content ?? "";
    return normalizeStreamContent(text);
  }

  return normalizeStreamContent(record.delta?.content ?? record.content ?? "");
};

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

    const abortCtrl = new AbortController();
    try {
      const upsertToolMessage = (id: string, nextPartial: { toolName?: string; params?: string; response?: string }) => {
        setMessages((prev) => {
          const index = prev.findIndex((item) => item.id === id);
          const existing = index >= 0 ? prev[index] : undefined;
          let base = { toolName: nextPartial.toolName, params: "", response: "" };
          if (existing?.content) {
            try {
              const parsed = JSON.parse(String(existing.content));
              base = { ...base, ...parsed };
            } catch {
              // ignore
            }
          }
          const merged = {
            toolName: nextPartial.toolName ?? base.toolName,
            params: (base.params || "") + (nextPartial.params || ""),
            response: nextPartial.response ?? base.response,
          };
          const msg: ConversationMessage = {
            role: "tool",
            content: JSON.stringify(merged),
            id,
            name: merged.toolName,
          };
          if (index >= 0) {
            const next = [...prev];
            next[index] = msg;
            return next;
          }
          const insertAt = prev.findIndex((item) => item.id === assistantMessageId);
          if (insertAt === -1) return [...prev, msg];
          const next = [...prev];
          next.splice(insertAt, 0, msg);
          return next;
        });
      };

      await streamFetch({
        url: `/api/chat/completions`,
        data: {
          token,
          messages: [userMessage],
          stream: true,
          conversationId: conversation.id,
        },
        abortCtrl,
        onMessage: (item) => {
          if (item.event === SseResponseEventEnum.answer) {
            if (!item.text) return;
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: `${normalizeStreamContent(msg.content)}${item.text}` }
                  : msg
              )
            );
            return;
          }
          if (item.event === SseResponseEventEnum.toolCall) {
            const payload = item as any;
            if (payload.id) {
              upsertToolMessage(payload.id, { toolName: payload.toolName, params: "", response: "" });
            }
            return;
          }
          if (item.event === SseResponseEventEnum.toolParams) {
            const payload = item as any;
            if (payload.id) {
              upsertToolMessage(payload.id, { toolName: payload.toolName, params: payload.params || "" });
            }
            return;
          }
          if (item.event === SseResponseEventEnum.toolResponse) {
            const payload = item as any;
            if (payload.id) {
              upsertToolMessage(payload.id, {
                toolName: payload.toolName,
                params: payload.params || "",
                response: payload.response || "",
              });
            }
            return;
          }
        },
      });
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
              {messages.map((message) => (
                <Box key={message.id ?? `${message.role}-${Math.random()}`}>
                  <ChatItem
                    message={message}
                    isStreaming={message.id === streamingMessageId}
                  />
                </Box>
              ))}
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

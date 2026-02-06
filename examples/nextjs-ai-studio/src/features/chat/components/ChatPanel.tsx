import { Box, Button, Flex, IconButton, Input, Spinner, Text } from "@chakra-ui/react";
import { createId, extractText } from "@shared/chat/messages";
import { streamFetch, SseResponseEventEnum } from "@shared/network/streamFetch";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useConversations } from "../hooks/useConversations";
import { getChatModels } from "../services/models";
import { getExecutionSummary } from "../utils/executionSummary";
import {
  upsertFlowNodeToolMessage,
  type FlowNodeResponsePayload,
} from "../utils/flowNodeMessages";

import ChatHeader from "./ChatHeader";
import ChatItem from "./ChatItem";
import ExecutionSummaryRow from "./ExecutionSummaryRow";

import type { ConversationMessage } from "@/types/conversation";

const normalizeStreamContent = (content: unknown) => {
  const text = extractText(content);
  return text ?? "";
};

interface ToolStreamPayload {
  id?: string;
  toolName?: string;
  params?: string;
  response?: string;
}

interface WorkflowDurationPayload {
  durationSeconds?: number;
}

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
  const [modelLoading, setModelLoading] = useState(false);
  const [model, setModel] = useState("agent");
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "agent", label: "agent" },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages(activeConversation?.messages ?? []);
  }, [activeConversation?.id, activeConversation?.messages]);

  useEffect(() => {
    let active = true;
    setModelLoading(true);
    getChatModels()
      .then((catalog) => {
        if (!active) return;
        const options = catalog.models.length
          ? catalog.models.map((item) => ({ value: item.id, label: item.label }))
          : [{ value: catalog.defaultModel || "agent", label: catalog.defaultModel || "agent" }];
        setModelOptions(options);
        setModel((prev) => {
          if (options.some((item) => item.value === prev)) return prev;
          return catalog.defaultModel || options[0]?.value || "agent";
        });
      })
      .catch(() => {
        if (!active) return;
        setModelOptions([{ value: "agent", label: "agent" }]);
      })
      .finally(() => {
        if (active) setModelLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
      const updateAssistantMetadata = (
        updater: (current: Record<string, unknown>) => Record<string, unknown>
      ) => {
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id !== assistantMessageId) return msg;
            const current =
              msg.additional_kwargs && typeof msg.additional_kwargs === "object"
                ? msg.additional_kwargs
                : {};
            return {
              ...msg,
              additional_kwargs: updater(current),
            };
          })
        );
      };

      const upsertFlowNodeResponseMessage = (payload: FlowNodeResponsePayload) => {
        setMessages((prev) =>
          upsertFlowNodeToolMessage({
            assistantMessageId,
            messages: prev,
            payload,
          })
        );
      };

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
          model,
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
            const payload = item as ToolStreamPayload;
            if (payload.id) {
              upsertToolMessage(payload.id, { toolName: payload.toolName, params: "", response: "" });
            }
            return;
          }
          if (item.event === SseResponseEventEnum.toolParams) {
            const payload = item as ToolStreamPayload;
            if (payload.id) {
              upsertToolMessage(payload.id, { toolName: payload.toolName, params: payload.params || "" });
            }
            return;
          }
          if (item.event === SseResponseEventEnum.toolResponse) {
            const payload = item as ToolStreamPayload;
            if (payload.id) {
              upsertToolMessage(payload.id, {
                toolName: payload.toolName,
                params: payload.params || "",
                response: payload.response || "",
              });
            }
            if (payload.response && onFilesUpdated) {
              try {
                const parsed = JSON.parse(payload.response);
                const files = (parsed as { files?: Record<string, { code: string }> }).files;
                if (files && typeof files === "object") {
                  onFilesUpdated(files);
                }
              } catch {
                return;
              }
            }
            return;
          }
          if (item.event === SseResponseEventEnum.flowNodeResponse) {
            const payload = item as FlowNodeResponsePayload;
            upsertFlowNodeResponseMessage(payload);
            updateAssistantMetadata((current) => {
              const currentResponseData = Array.isArray(current.responseData)
                ? current.responseData
                : [];
              return {
                ...current,
                responseData: [...currentResponseData, payload],
              };
            });
            return;
          }
          if (item.event === SseResponseEventEnum.workflowDuration) {
            const payload = item as WorkflowDurationPayload;
            if (typeof payload.durationSeconds !== "number") return;
            updateAssistantMetadata((current) => ({
              ...current,
              durationSeconds: payload.durationSeconds,
            }));
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
  }, [ensureConversation, input, isSending, model, onFilesUpdated, token]);

  const activeConversationTitle = useMemo(() => activeConversation?.title, [activeConversation?.title]);

  return (
    <Flex bg="white" borderColor="gray.200" borderLeft="1px solid" direction="column" h={height}>
      <ChatHeader
        activeConversationId={activeConversation?.id}
        conversations={conversations}
        model={model}
        modelLoading={modelLoading}
        modelOptions={modelOptions}
        onChangeModel={setModel}
        onDeleteAllConversations={() => deleteAllConversations()}
        onDeleteConversation={(id) => deleteConversation(id)}
        onNewConversation={() => createNewConversation()}
        onSelectConversation={(id) => loadConversation(id)}
        title={activeConversationTitle}
      />

      <Flex direction="column" flex="1" overflow="hidden">
        <Box ref={scrollRef} bg="gray.50" flex="1" overflowY="auto" px={4} py={4}>
          {!isInitialized || isLoadingConversation ? (
            <Flex align="center" color="gray.500" gap={2} h="full" justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm">加载对话...</Text>
            </Flex>
          ) : messages.length === 0 ? (
            <Flex align="center" color="gray.400" h="full" justify="center">
              <Text fontSize="sm">开始提问吧</Text>
            </Flex>
          ) : (
            <Flex direction="column" gap={3}>
              {messages.map((message) => (
                <Box key={message.id ?? `${message.role}-${Math.random()}`}>
                  <ChatItem
                    isStreaming={message.id === streamingMessageId}
                    message={message}
                  />
                  {(() => {
                    const summary = getExecutionSummary(message);
                    if (!summary) return null;
                    return (
                      <ExecutionSummaryRow
                        durationSeconds={summary.durationSeconds}
                        nodeCount={summary.nodeCount}
                      />
                    );
                  })()}
                </Box>
              ))}
            </Flex>
          )}
        </Box>

        <Flex bg="white" borderColor="gray.200" borderTop="1px solid" gap={2} px={4} py={3}>
          <Input
            isDisabled={isSending}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入你的问题..."
            value={input}
          />
          <IconButton
            aria-label="Send"
            colorScheme="purple"
            icon={<Text fontSize="sm">发送</Text>}
            isLoading={isSending}
            onClick={handleSend}
          />
          {streamingMessageId ? (
            <Button size="sm" variant="ghost" isDisabled>
              生成中...
            </Button>
          ) : null}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ChatPanel;

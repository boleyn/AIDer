import { Box, Button, Flex, Spinner, Text } from "@chakra-ui/react";
import { withAuthHeaders } from "@features/auth/client/authClient";
import { createId, extractText } from "@shared/chat/messages";
import { streamFetch, SseResponseEventEnum } from "@shared/network/streamFetch";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";


import { useConversations } from "../hooks/useConversations";
import { getChatModels } from "../services/models";
import type { ChatInputFile, ChatInputSubmitPayload } from "../types/chatInput";
import { getExecutionSummary } from "../utils/executionSummary";
import {
  upsertFlowNodeToolMessage,
  type FlowNodeResponsePayload,
} from "../utils/flowNodeMessages";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatItem from "./ChatItem";
import ExecutionSummaryRow from "./ExecutionSummaryRow";

import type { ConversationMessage } from "@/types/conversation";
import { postStopV2Chat } from "@/web/core/chat/api";

const normalizeStreamContent = (content: unknown) => {
  const text = extractText(content);
  return text ?? "";
};

const TEXT_FILE_EXTENSIONS = [
  ".txt",
  ".md",
  ".json",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".java",
  ".go",
  ".rs",
  ".css",
  ".html",
  ".xml",
  ".yml",
  ".yaml",
  ".log",
  ".csv",
] as const;
const MAX_TEXT_FILE_SIZE = 200 * 1024;
const MAX_TEXT_FILE_PREVIEW = 3000;

interface ToolStreamPayload {
  id?: string;
  toolName?: string;
  params?: string;
  response?: string;
}

interface WorkflowDurationPayload {
  durationSeconds?: number;
}

const isTextLikeFile = (file: File) => {
  if (file.type.startsWith("text/")) return true;
  const lowerName = file.name.toLowerCase();
  return TEXT_FILE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
};

const buildFilePrompt = async (files: ChatInputFile[]) => {
  if (files.length === 0) return "";

  const sections: string[] = [];

  for (const item of files) {
    const file = item.file;
    const header = `文件: ${file.name} (${file.type || "unknown"}, ${file.size} bytes)`;

    if (!isTextLikeFile(file) || file.size > MAX_TEXT_FILE_SIZE) {
      sections.push(`${header}\n该文件为二进制或过大文件，仅提供元信息。`);
      continue;
    }

    try {
      const raw = await file.text();
      const preview = raw.slice(0, MAX_TEXT_FILE_PREVIEW);
      sections.push(
        `${header}\n\n\`\`\`\n${preview}${raw.length > MAX_TEXT_FILE_PREVIEW ? "\n... [truncated]" : ""}\n\`\`\``
      );
    } catch {
      sections.push(`${header}\n无法读取文件内容，仅提供元信息。`);
    }
  }

  return sections.join("\n\n");
};

const toFileArtifacts = (files: ChatInputFile[]) =>
  files.map((item) => ({
    name: item.file.name,
    size: item.file.size,
    type: item.file.type,
    lastModified: item.file.lastModified,
  }));

const ChatPanel = ({
  token,
  onFilesUpdated,
  height = "100%",
}: {
  token: string;
  onFilesUpdated?: (files: Record<string, { code: string }>) => void;
  height?: string;
}) => {
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
  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [model, setModel] = useState("agent");
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>([
    { value: "agent", label: "agent" },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingConversationIdRef = useRef<string | null>(null);

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

  const handleSend = useCallback(
    async (payload: ChatInputSubmitPayload) => {
      const text = payload.text.trim();
      if ((text.length === 0 && payload.files.length === 0) || isSending) return;

      const conversation = await ensureConversation();
      if (!conversation) return;

      const filePrompt = await buildFilePrompt(payload.files);
      const displayText = text || `已上传 ${payload.files.length} 个文件`;

      const userMessage: ConversationMessage = {
        role: "user",
        content: displayText,
        id: createId(),
        artifact:
          payload.files.length > 0
            ? {
                files: toFileArtifacts(payload.files),
              }
            : undefined,
        additional_kwargs: filePrompt
          ? {
              filePrompt,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, userMessage]);
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
      streamAbortRef.current = abortCtrl;
      streamingConversationIdRef.current = conversation.id;
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

        const upsertFlowNodeResponseMessage = (nextPayload: FlowNodeResponsePayload) => {
          setMessages((prev) =>
            upsertFlowNodeToolMessage({
              assistantMessageId,
              messages: prev,
              payload: nextPayload,
            })
          );
        };

        const upsertToolMessage = (
          id: string,
          nextPartial: { toolName?: string; params?: string; response?: string }
        ) => {
          setMessages((prev) => {
            const index = prev.findIndex((item) => item.id === id);
            const existing = index >= 0 ? prev[index] : undefined;
            let base = { toolName: nextPartial.toolName, params: "", response: "" };
            if (existing?.content) {
              try {
                const parsed = JSON.parse(String(existing.content));
                base = { ...base, ...parsed };
              } catch {
                // ignore parse failure
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
          headers: withAuthHeaders(),
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
              const streamPayload = item as ToolStreamPayload;
              if (streamPayload.id) {
                upsertToolMessage(streamPayload.id, {
                  toolName: streamPayload.toolName,
                  params: "",
                  response: "",
                });
              }
              return;
            }
            if (item.event === SseResponseEventEnum.toolParams) {
              const streamPayload = item as ToolStreamPayload;
              if (streamPayload.id) {
                upsertToolMessage(streamPayload.id, {
                  toolName: streamPayload.toolName,
                  params: streamPayload.params || "",
                });
              }
              return;
            }
            if (item.event === SseResponseEventEnum.toolResponse) {
              const streamPayload = item as ToolStreamPayload;
              if (streamPayload.id) {
                upsertToolMessage(streamPayload.id, {
                  toolName: streamPayload.toolName,
                  params: streamPayload.params || "",
                  response: streamPayload.response || "",
                });
              }

              if (streamPayload.response && onFilesUpdated) {
                try {
                  const parsed = JSON.parse(streamPayload.response);
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
              const streamPayload = item as FlowNodeResponsePayload;
              upsertFlowNodeResponseMessage(streamPayload);
              updateAssistantMetadata((current) => {
                const currentResponseData = Array.isArray(current.responseData)
                  ? current.responseData
                  : [];
                return {
                  ...current,
                  responseData: [...currentResponseData, streamPayload],
                };
              });
              return;
            }
            if (item.event === SseResponseEventEnum.workflowDuration) {
              const streamPayload = item as WorkflowDurationPayload;
              if (typeof streamPayload.durationSeconds !== "number") return;
              updateAssistantMetadata((current) => ({
                ...current,
                durationSeconds: streamPayload.durationSeconds,
              }));
            }
          },
        });
      } catch (error) {
        if (abortCtrl.signal.aborted) {
          return;
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: `请求失败: ${error instanceof Error ? error.message : "未知错误"}` }
              : msg
          )
        );
      } finally {
        if (streamAbortRef.current === abortCtrl) {
          streamAbortRef.current = null;
          streamingConversationIdRef.current = null;
        }
        setStreamingMessageId(null);
        setIsSending(false);
      }
    },
    [ensureConversation, isSending, model, onFilesUpdated, token]
  );

  const handleStop = useCallback(async () => {
    const chatId = streamingConversationIdRef.current;
    const abortCtrl = streamAbortRef.current;
    if (!chatId || !abortCtrl) return;

    try {
      await postStopV2Chat({ token, chatId });
    } catch {
      // ignore stop API errors and still abort local stream
    } finally {
      abortCtrl.abort(new Error("stop"));
    }
  }, [token]);

  const activeConversationTitle = useMemo(() => activeConversation?.title, [activeConversation?.title]);

  return (
    <Flex
      backdropFilter="blur(20px)"
      bg="rgba(255,255,255,0.72)"
      border="1px solid"
      borderBottomLeftRadius="2xl"
      borderColor="rgba(255,255,255,0.75)"
      borderRight={0}
      borderTopLeftRadius="2xl"
      boxShadow="0 24px 42px -28px rgba(15,23,42,0.35)"
      direction="column"
      h={height}
      overflow="hidden"
    >
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
        <Box
          ref={scrollRef}
          bg="linear-gradient(180deg, rgba(248,250,252,0.72) 0%, rgba(241,245,249,0.62) 100%)"
          flex="1"
          overflowY="auto"
          px={4}
          py={4}
        >
          {!isInitialized || isLoadingConversation ? (
            <Flex align="center" color="gray.600" gap={2} h="full" justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm">加载对话...</Text>
            </Flex>
          ) : messages.length === 0 ? (
            <Flex align="center" color="gray.500" h="full" justify="center">
              <Box textAlign="center">
                <Text color="myGray.700" fontSize="lg" fontWeight="700">
                  准备开始
                </Text>
                <Text fontSize="sm" mt={1}>
                  描述你想改的功能，我会直接修改代码
                </Text>
              </Box>
            </Flex>
          ) : (
            <Flex direction="column" gap={3}>
              {messages.map((message, index) => {
                const messageId = message.id ?? `${message.role}-${index}`;
                return (
                  <Box key={messageId}>
                    <ChatItem
                      isStreaming={message.id === streamingMessageId}
                      message={message}
                      messageId={messageId}
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
                );
              })}
            </Flex>
          )}
        </Box>

        <ChatInput
          isSending={isSending}
          model={model}
          modelLoading={modelLoading}
          modelOptions={modelOptions}
          onChangeModel={setModel}
          onSend={handleSend}
          onStop={handleStop}
        />

        {streamingMessageId ? (
          <Flex
            align="center"
            bg="rgba(255,255,255,0.9)"
            borderTop="1px solid rgba(226,232,240,0.9)"
            justify="space-between"
            px={4}
            py={2}
          >
            <Text color="myGray.500" fontSize="xs">
              正在生成回复...
            </Text>
            <Button
              onClick={handleStop}
              size="xs"
              variant="ghost"
            >
              停止
            </Button>
          </Flex>
        ) : null}
      </Flex>
    </Flex>
  );
};

export default ChatPanel;

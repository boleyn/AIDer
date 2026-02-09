import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import { withAuthHeaders } from "@features/auth/client/authClient";
import { createId } from "@shared/chat/messages";
import { streamFetch, SseResponseEventEnum } from "@shared/network/streamFetch";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConversations } from "../hooks/useConversations";
import { getChatModels } from "../services/models";
import type { ChatInputFile, ChatInputSubmitPayload } from "../types/chatInput";
import { getExecutionSummary } from "../utils/executionSummary";
import { type FlowNodeResponsePayload } from "../utils/flowNodeMessages";

import ChatHeader from "./ChatHeader";
import ChatInput from "./ChatInput";
import ChatItem from "./ChatItem";
import ExecutionSummaryRow from "./ExecutionSummaryRow";

import type { ConversationMessage } from "@/types/conversation";

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
const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024;

interface UploadedFileArtifact {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  storagePath: string;
}

interface ToolStreamPayload {
  id?: string;
  toolName?: string;
  params?: string;
  response?: string;
}

interface WorkflowDurationPayload {
  durationSeconds?: number;
}

const buildConversationTitle = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > 40 ? `${trimmed.slice(0, 40)}...` : trimmed;
};

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

const fileToBase64 = async (file: File) => {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

const uploadChatFiles = async ({
  token,
  chatId,
  files,
}: {
  token: string;
  chatId: string;
  files: ChatInputFile[];
}): Promise<UploadedFileArtifact[]> => {
  const uploadable = files.filter((item) => item.file.size <= MAX_UPLOAD_FILE_SIZE);
  if (uploadable.length === 0) return [];

  const payload = await Promise.all(
    uploadable.map(async (item) => ({
      name: item.file.name,
      type: item.file.type,
      lastModified: item.file.lastModified,
      contentBase64: await fileToBase64(item.file),
    }))
  );

  const response = await fetch("/api/core/chat/files/upload", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...withAuthHeaders(),
    },
    body: JSON.stringify({
      token,
      chatId,
      files: payload,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data?.error === "string" ? data.error : "上传失败");
  }

  const data = (await response.json()) as { files?: UploadedFileArtifact[] };
  return Array.isArray(data.files) ? data.files : [];
};

const toUpdatedFilesMap = (value: unknown): Record<string, { code: string }> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return null;

  const normalized: Record<string, { code: string }> = {};
  for (const [path, file] of entries) {
    if (!path || typeof path !== "string") return null;
    if (!file || typeof file !== "object" || Array.isArray(file)) return null;

    const code = (file as { code?: unknown }).code;
    if (typeof code !== "string") return null;

    normalized[path] = { code };
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
};

const ChatPanel = ({
  token,
  onFilesUpdated,
  height = "100%",
}: {
  token: string;
  onFilesUpdated?: (files: Record<string, { code: string }>) => void;
  height?: string;
}) => {
  const { t } = useTranslation();
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
    updateConversationTitle,
  } = useConversations(token, router);

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [model, setModel] = useState("agent");
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string; icon?: string }>>([
    { value: "agent", label: "agent" },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const streamingConversationIdRef = useRef<string | null>(null);
  const streamingTextRef = useRef("");
  const streamFlushFrameRef = useRef<number | null>(null);

  const flushAssistantText = useCallback((assistantMessageId: string, content: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === assistantMessageId
          ? {
              ...msg,
              content,
            }
          : msg
      )
    );
  }, []);

  const scheduleAssistantTextFlush = useCallback(
    (assistantMessageId: string) => {
      if (streamFlushFrameRef.current !== null) return;

      streamFlushFrameRef.current = window.requestAnimationFrame(() => {
        streamFlushFrameRef.current = null;
        flushAssistantText(assistantMessageId, streamingTextRef.current);
      });
    },
    [flushAssistantText]
  );

  useEffect(() => {
    setMessages(activeConversation?.messages ?? []);
  }, [activeConversation?.id, activeConversation?.messages]);

  useEffect(() => {
    let active = true;
    setModelLoading(true);
    getChatModels(true)
      .then((catalog) => {
        if (!active) return;
        const options = catalog.models.length
          ? catalog.models.map((item) => {
              return {
                value: item.id,
                label: item.label || item.id,
              };
            })
          : [{ value: catalog.defaultModel || catalog.toolCallModel || "agent", label: catalog.defaultModel || catalog.toolCallModel || "agent" }];
        setModelOptions(options);
        setModel((prev) => {
          if (options.some((item) => item.value === prev)) return prev;
          return catalog.defaultModel || catalog.toolCallModel || options[0]?.value || "agent";
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

  useEffect(() => {
    return () => {
      if (streamFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFlushFrameRef.current);
        streamFlushFrameRef.current = null;
      }
    };
  }, []);

  const handleSend = useCallback(
    async (payload: ChatInputSubmitPayload) => {
      const text = payload.text.trim();
      if ((text.length === 0 && payload.files.length === 0) || isSending) return;

      const conversation = await ensureConversation();
      const conversationId = conversation?.id ?? activeConversation?.id;

      const filePrompt = await buildFilePrompt(payload.files);
      const displayText = text || `已上传 ${payload.files.length} 个文件`;
      const nextConversationTitle = buildConversationTitle(text);
      const uploadedFiles =
        payload.files.length > 0 && conversationId
          ? await uploadChatFiles({ token, chatId: conversationId, files: payload.files }).catch(
              () => []
            )
          : [];

      if (conversationId && nextConversationTitle) {
        updateConversationTitle(conversationId, nextConversationTitle);
      }

      const userMessage: ConversationMessage = {
        role: "user",
        content: displayText,
        id: createId(),
        artifact:
          payload.files.length > 0
            ? {
                files: uploadedFiles.length > 0 ? uploadedFiles : toFileArtifacts(payload.files),
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
      streamingTextRef.current = "";
      if (streamFlushFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFlushFrameRef.current);
        streamFlushFrameRef.current = null;
      }
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
      streamingConversationIdRef.current = conversationId ?? null;
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

        const upsertToolMessage = (
          id: string,
          nextPartial: { toolName?: string; params?: string; response?: string }
        ) => {
          updateAssistantMetadata((current) => {
            const list = Array.isArray(current.toolDetails)
              ? (current.toolDetails as Array<{
                  id?: string;
                  toolName?: string;
                  params?: string;
                  response?: string;
                }>)
              : [];
            const index = list.findIndex((item) => item.id === id);
            const base = index >= 0 ? list[index] : { id, params: "", response: "" };
            const merged = {
              ...base,
              id,
              toolName: nextPartial.toolName ?? base.toolName,
              params: `${base.params || ""}${nextPartial.params || ""}`,
              response: nextPartial.response ?? base.response,
            };
            const next = [...list];
            if (index >= 0) {
              next[index] = merged;
            } else {
              next.push(merged);
            }
            return {
              ...current,
              toolDetails: next,
            };
          });
        };

        await streamFetch({
          url: `/api/chat/completions`,
          data: {
            token,
            messages: [userMessage],
            stream: true,
            ...(conversationId ? { conversationId } : {}),
            model,
          },
          headers: withAuthHeaders(),
          abortCtrl,
          onMessage: (item) => {
            if (abortCtrl.signal.aborted) return;
            if (item.event === SseResponseEventEnum.answer) {
              if (!item.text) return;
              streamingTextRef.current = `${streamingTextRef.current}${item.text}`;
              scheduleAssistantTextFlush(assistantMessageId);
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
                  const filesCandidate =
                    (parsed as { files?: Record<string, { code: string }> }).files ||
                    (parsed as { data?: { files?: Record<string, { code: string }> } }).data?.files;
                  const files = toUpdatedFilesMap(filesCandidate);
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
        if (streamFlushFrameRef.current !== null) {
          window.cancelAnimationFrame(streamFlushFrameRef.current);
          streamFlushFrameRef.current = null;
        }
        if (streamingTextRef.current) {
          flushAssistantText(assistantMessageId, streamingTextRef.current);
        }
        if (streamAbortRef.current === abortCtrl) {
          streamAbortRef.current = null;
          streamingConversationIdRef.current = null;
        }
        setStreamingMessageId(null);
        setIsSending(false);
      }
    },
    [
      activeConversation?.id,
      ensureConversation,
      isSending,
      model,
      onFilesUpdated,
      token,
      updateConversationTitle,
    ]
  );

  const handleStop = useCallback(() => {
    const chatId = streamingConversationIdRef.current;
    const abortCtrl = streamAbortRef.current;
    if (!abortCtrl) return;

    // 立即停止前端流，确保按钮点击立刻生效
    abortCtrl.abort(new Error("stop"));

    if (!chatId) return;

    // 后端停止异步执行，避免网络慢导致前端停不下来
    const stopApiAbort = new AbortController();
    const timeout = setTimeout(() => stopApiAbort.abort(new Error("stop timeout")), 5000);
    fetch("/api/v2/chat/stop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...withAuthHeaders(),
      },
      body: JSON.stringify({ token, chatId }),
      signal: stopApiAbort.signal,
    })
      .catch(() => {
        // ignore stop API errors
      })
      .finally(() => {
        clearTimeout(timeout);
      });
  }, [token]);

  const activeConversationTitle = useMemo(() => activeConversation?.title, [activeConversation?.title]);

  return (
    <Flex
      backdropFilter="blur(10px)"
      bg="rgba(255,255,255,0.9)"
      border="1px solid"
      borderBottomLeftRadius="xl"
      borderColor="rgba(203,213,225,0.85)"
      borderRight={0}
      borderTopLeftRadius="xl"
      boxShadow="0 12px 30px -18px rgba(15,23,42,0.2)"
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
          bg="linear-gradient(180deg, rgba(248,250,252,0.82) 0%, rgba(241,245,249,0.78) 100%)"
          flex="1"
          overflowY="auto"
          px={4}
          py={4}
        >
          {!isInitialized || isLoadingConversation ? (
            <Flex align="center" color="gray.600" gap={2} h="full" justify="center">
              <Spinner size="sm" />
              <Text fontSize="sm">{t("chat:loading_conversation", { defaultValue: "加载对话..." })}</Text>
            </Flex>
          ) : messages.length === 0 ? (
            <Flex align="center" color="gray.500" h="full" justify="center">
              <Box textAlign="center">
                <Text color="myGray.700" fontSize="lg" fontWeight="700">
                  {t("chat:ready_start", { defaultValue: "准备开始" })}
                </Text>
                <Text fontSize="sm" mt={1}>
                  {t("chat:ready_desc", { defaultValue: "描述你想改的功能，我会直接修改代码" })}
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
      </Flex>
    </Flex>
  );
};

export default ChatPanel;

import { Box, Flex, Text } from "@chakra-ui/react";
import { extractText } from "@shared/chat/messages";
import { useTranslation } from "next-i18next";
import React, { useMemo } from "react";
import Markdown from "@/components/Markdown";

import type { ConversationMessage } from "@/types/conversation";

interface MessageFile {
  name?: string;
  size?: number;
  type?: string;
}

interface ToolDetail {
  id?: string;
  toolName?: string;
  params?: string;
  response?: string;
}

const formatFileSize = (size?: number) => {
  if (typeof size !== "number" || Number.isNaN(size) || size < 0) return "";
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const getMessageFiles = (message: ConversationMessage): MessageFile[] => {
  if (!message.artifact || typeof message.artifact !== "object") return [];
  const files = (message.artifact as { files?: unknown }).files;
  if (!Array.isArray(files)) return [];
  return files.filter((file): file is MessageFile => Boolean(file && typeof file === "object"));
};

const getToolDetails = (message: ConversationMessage): ToolDetail[] => {
  if (!message.additional_kwargs || typeof message.additional_kwargs !== "object") return [];
  const kwargs = message.additional_kwargs as {
    toolDetails?: unknown;
    responseData?: unknown;
  };

  const rawToolDetails = kwargs.toolDetails;
  if (Array.isArray(rawToolDetails) && rawToolDetails.length > 0) {
    return rawToolDetails.filter((item): item is ToolDetail => Boolean(item && typeof item === "object"));
  }

  const responseData = kwargs.responseData;
  if (!Array.isArray(responseData)) return [];

  return responseData
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item, index) => ({
      id: typeof item.nodeId === "string" ? `${item.nodeId}-${index}` : undefined,
      toolName: typeof item.moduleName === "string" ? item.moduleName : undefined,
      params:
        typeof item.toolInput === "string"
          ? item.toolInput
          : item.toolInput == null
          ? ""
          : JSON.stringify(item.toolInput, null, 2),
      response:
        typeof item.toolRes === "string"
          ? item.toolRes
          : item.toolRes == null
          ? ""
          : JSON.stringify(item.toolRes, null, 2),
    }));
};

const ChatItem = ({
  message,
  isStreaming,
  messageId,
}: {
  message: ConversationMessage;
  isStreaming?: boolean;
  messageId: string;
}) => {
  const { t } = useTranslation();
  const content = extractText(message.content);
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const files = useMemo(() => getMessageFiles(message), [message]);
  const toolDetails = useMemo(() => getToolDetails(message), [message]);

  if (!content.trim() && !isStreaming && files.length === 0 && toolDetails.length === 0) return null;

  return (
    <Flex justify={isUser ? "flex-end" : "flex-start"} w="full">
      <Box
        backdropFilter="blur(3px)"
        bg={
          isUser
            ? "linear-gradient(135deg, rgba(64,124,255,0.12) 0%, rgba(148,163,184,0.08) 100%)"
            : "rgba(255,255,255,0.92)"
        }
        border="1px solid"
        borderColor={isUser ? "rgba(52,122,255,0.34)" : "rgba(203,213,225,0.92)"}
        borderRadius={isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px"}
        boxShadow="0 8px 16px -14px rgba(15,23,42,0.28)"
        className="chat-message"
        color="myGray.700"
        fontSize="sm"
        maxW="92%"
        minW="88px"
        px={4}
        py={3}
      >
        {isUser ? (
          <Flex direction="column" gap={2}>
            {files.length > 0 ? (
              <Box bg="white" border="1px solid" borderColor="blue.100" borderRadius="md" p={2}>
                <Text color="blue.700" fontSize="xs" fontWeight="700" mb={1.5}>
                  {t("chat:attachments", { defaultValue: "附件" })}
                </Text>
                <Flex direction="column" gap={1}>
                  {files.map((file, index) => (
                    <Text key={`${file.name || "file"}-${index}`} color="gray.700" fontSize="xs">
                      {file.name || `文件 ${index + 1}`}
                      {file.type ? ` · ${file.type}` : ""}
                      {formatFileSize(file.size) ? ` · ${formatFileSize(file.size)}` : ""}
                    </Text>
                  ))}
                </Flex>
              </Box>
            ) : null}

            {content ? <Markdown source={content} /> : null}
          </Flex>
        ) : isSystem ? (
          <Text color="gray.500" fontSize="xs">
            {content}
          </Text>
        ) : (
          <Flex direction="column" gap={2}>
            {toolDetails.length > 0 ? (
              <Flex direction="column" gap={2}>
                {toolDetails.map((tool, index) => (
                  <Box
                    key={tool.id || `${messageId}-tool-${index}`}
                    bg="rgba(248,250,252,0.95)"
                    border="1px solid"
                    borderColor="rgba(203,213,225,0.9)"
                    borderRadius="10px"
                    p={2}
                  >
                    <Text color="blue.700" fontSize="xs" fontWeight="700">
                      {tool.toolName || `工具 ${index + 1}`}
                    </Text>
                    {tool.params ? (
                      <Text color="gray.600" fontFamily="mono" fontSize="11px" mt={1} whiteSpace="pre-wrap">
                        {tool.params}
                      </Text>
                    ) : null}
                    {tool.response ? (
                      <Text color="gray.800" fontSize="12px" mt={1.5} whiteSpace="pre-wrap">
                        {tool.response}
                      </Text>
                    ) : isStreaming ? (
                      <Text color="gray.500" fontSize="12px" mt={1.5}>
                        执行中...
                      </Text>
                    ) : null}
                  </Box>
                ))}
              </Flex>
            ) : null}
            {content ? <Markdown source={content} /> : null}
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default React.memo(
  ChatItem,
  (prevProps, nextProps) =>
    prevProps.isStreaming === nextProps.isStreaming &&
    prevProps.messageId === nextProps.messageId &&
    prevProps.message === nextProps.message
);

import { Box, Flex, Text } from "@chakra-ui/react";
import { extractText } from "@shared/chat/messages";
import { useTranslation } from "next-i18next";
import { useMemo } from "react";

import { adaptConversationMessageToValues } from "../utils/chatMessageAdapter";

import Markdown from "@/components/Markdown";
import AIResponseBox from "@/components/core/chat/components/AIResponseBox";
import type { ConversationMessage } from "@/types/conversation";

interface MessageFile {
  name?: string;
  size?: number;
  type?: string;
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
  const adaptedValues = useMemo(() => adaptConversationMessageToValues(message), [message]);

  if (message.role === "assistant" && adaptedValues.length === 0 && !isStreaming) return null;
  if (!content.trim() && !isStreaming && files.length === 0 && message.role !== "assistant") return null;

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
            {adaptedValues.map((value, index) => (
              <AIResponseBox
                key={`${messageId}-value-${index}`}
                chatItemDataId={messageId}
                isChatting={Boolean(isStreaming)}
                isLastResponseValue={index === adaptedValues.length - 1}
                value={value}
              />
            ))}
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default ChatItem;

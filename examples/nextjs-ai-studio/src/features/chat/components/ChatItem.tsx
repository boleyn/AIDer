import { Box, Flex, Text } from "@chakra-ui/react";
import { useMemo } from "react";

import Markdown from "@/components/Markdown";
import AIResponseBox from "@/components/core/chat/components/AIResponseBox";
import { extractText } from "@shared/chat/messages";

import { adaptConversationMessageToValues } from "../utils/chatMessageAdapter";

import type { ConversationMessage } from "@/types/conversation";

type MessageFile = {
  name?: string;
  size?: number;
  type?: string;
};

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
  const content = extractText(message.content);
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  const files = useMemo(() => getMessageFiles(message), [message]);
  const adaptedValues = useMemo(() => adaptConversationMessageToValues(message), [message]);

  if (!content.trim() && !isStreaming && files.length === 0 && message.role !== "assistant") return null;

  return (
    <Flex justify={isUser ? "flex-end" : "flex-start"} w="full">
      <Box
        className="chat-message"
        maxW="92%"
        minW="88px"
        border="1px solid"
        borderColor={isUser ? "rgba(52,122,255,0.38)" : "rgba(203,213,225,0.8)"}
        borderRadius={isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px"}
        bg={
          isUser
            ? "linear-gradient(135deg, rgba(58,124,255,0.14) 0%, rgba(34,211,238,0.18) 100%)"
            : "rgba(255,255,255,0.84)"
        }
        backdropFilter="blur(5px)"
        px={4}
        py={3}
        fontSize="sm"
        color="myGray.700"
        boxShadow="0 10px 24px -20px rgba(15,23,42,0.5)"
      >
        {isUser ? (
          <Flex direction="column" gap={2}>
            {files.length > 0 ? (
              <Box border="1px solid" borderColor="blue.100" borderRadius="md" bg="white" p={2}>
                <Text fontSize="xs" color="blue.700" fontWeight="700" mb={1.5}>
                  附件
                </Text>
                <Flex direction="column" gap={1}>
                  {files.map((file, index) => (
                    <Text key={`${file.name || "file"}-${index}`} fontSize="xs" color="gray.700">
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
          <Text fontSize="xs" color="gray.500">
            {content}
          </Text>
        ) : (
          <Flex direction="column" gap={2}>
            {adaptedValues.map((value, index) => (
              <AIResponseBox
                key={`${messageId}-value-${index}`}
                chatItemDataId={messageId}
                value={value}
                isChatting={Boolean(isStreaming)}
                isLastResponseValue={index === adaptedValues.length - 1}
              />
            ))}
          </Flex>
        )}
      </Box>
    </Flex>
  );
};

export default ChatItem;

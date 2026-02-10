import {
  Box,
  Button,
  Collapse,
  Flex,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { extractText } from "@shared/chat/messages";
import { useTranslation } from "next-i18next";
import React, { useCallback, useMemo, useState } from "react";
import Markdown from "@/components/Markdown";
import { useCopyData } from "@/hooks/useCopyData";

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

const MAX_TOOL_DETAIL_CHARS = 800;

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

const truncateDetailText = (value?: string) => {
  if (!value) return "";
  const normalized = value.trim();
  if (normalized.length <= MAX_TOOL_DETAIL_CHARS) return normalized;
  return `${normalized.slice(0, MAX_TOOL_DETAIL_CHARS)}\n...`;
};

const isDetailTruncated = (value?: string) => {
  if (!value) return false;
  return value.trim().length > MAX_TOOL_DETAIL_CHARS;
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
  const [expandedToolKeys, setExpandedToolKeys] = useState<Record<string, boolean>>({});
  const [detailModalData, setDetailModalData] = useState<{ title: string; content: string } | null>(null);
  const { isOpen: isDetailModalOpen, onOpen: openDetailModal, onClose: closeDetailModal } = useDisclosure();
  const { copyData } = useCopyData();

  const toggleToolDetails = useCallback((key: string) => {
    setExpandedToolKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const openToolDetailModal = useCallback(
    (title: string, content?: string) => {
      setDetailModalData({
        title,
        content: content || "",
      });
      openDetailModal();
    },
    [openDetailModal]
  );

  const handleCloseDetailModal = useCallback(() => {
    closeDetailModal();
    setDetailModalData(null);
  }, [closeDetailModal]);

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
        minH="0"
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
                {toolDetails.map((tool, index) => {
                  const toolKey = tool.id || `${messageId}-tool-${index}`;
                  const isExpanded = Boolean(expandedToolKeys[toolKey]);
                  const isRunning = isStreaming && !tool.response;
                  const isLastTool = index === toolDetails.length - 1;
                  const truncatedParams = truncateDetailText(tool.params);
                  const truncatedResponse = truncateDetailText(tool.response);
                  const paramsTruncated = isDetailTruncated(tool.params);
                  const responseTruncated = isDetailTruncated(tool.response);

                  return (
                    <Flex key={toolKey} align="stretch" gap={2}>
                      <Flex align="center" direction="column" w="12px">
                        <Box bg={isRunning ? "blue.400" : "green.400"} borderRadius="full" h="7px" mt="7px" w="7px" />
                        {!isLastTool ? <Box bg="gray.300" flex="1" mt={1} w="1px" /> : null}
                      </Flex>

                      <Box
                        bg="rgba(248,250,252,0.95)"
                        border="1px solid"
                        borderColor="rgba(203,213,225,0.9)"
                        borderRadius="10px"
                        flex="1"
                        maxW="full"
                        minW={0}
                        p={2.5}
                      >
                        <Flex align="center" gap={2}>
                          <Text color="gray.800" flex="1" fontSize="12px" fontWeight="600" noOfLines={1}>
                            {tool.toolName || `工具 ${index + 1}`}
                          </Text>
                          <IconButton
                            aria-label={isExpanded ? "收起工具详情" : "展开工具详情"}
                            icon={
                              <Icon
                                boxSize={4}
                                color="gray.500"
                                transform={isExpanded ? "rotate(180deg)" : "rotate(0deg)"}
                                transition="transform 0.2s ease"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M6 9L12 15L18 9"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                />
                              </Icon>
                            }
                            minW="24px"
                            h="24px"
                            onClick={() => toggleToolDetails(toolKey)}
                            size="xs"
                            variant="ghost"
                          />
                        </Flex>

                        <Collapse animateOpacity in={isExpanded}>
                          <Flex direction="column" gap={2} mt={2}>
                            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="8px" p={2}>
                              <Flex align="center" justify="space-between" mb={1}>
                                <Text color="blue.700" fontSize="10px" fontWeight="700">
                                  入参
                                </Text>
                                {paramsTruncated ? (
                                  <Button
                                    colorScheme="blue"
                                    h="20px"
                                    minW="auto"
                                    onClick={() =>
                                      openToolDetailModal(`${tool.toolName || `工具 ${index + 1}`} · 入参`, tool.params)
                                    }
                                    px={2}
                                    size="xs"
                                    variant="ghost"
                                  >
                                    查看完整
                                  </Button>
                                ) : null}
                              </Flex>
                              <Text
                                color="gray.600"
                                fontFamily="mono"
                                fontSize="11px"
                                overflowWrap="anywhere"
                                whiteSpace="pre-wrap"
                                wordBreak="break-word"
                              >
                                {truncatedParams || "{}"}
                              </Text>
                            </Box>

                            <Box bg="white" border="1px solid" borderColor="gray.200" borderRadius="8px" p={2}>
                              <Flex align="center" justify="space-between" mb={1}>
                                <Text color="green.700" fontSize="10px" fontWeight="700">
                                  出参
                                </Text>
                                {responseTruncated ? (
                                  <Button
                                    colorScheme="green"
                                    h="20px"
                                    minW="auto"
                                    onClick={() =>
                                      openToolDetailModal(`${tool.toolName || `工具 ${index + 1}`} · 出参`, tool.response)
                                    }
                                    px={2}
                                    size="xs"
                                    variant="ghost"
                                  >
                                    查看完整
                                  </Button>
                                ) : null}
                              </Flex>
                              {truncatedResponse ? (
                                <Text
                                  color="gray.800"
                                  fontFamily="mono"
                                  fontSize="11px"
                                  overflowWrap="anywhere"
                                  whiteSpace="pre-wrap"
                                  wordBreak="break-word"
                                >
                                  {truncatedResponse}
                                </Text>
                              ) : isRunning ? (
                                <Text color="gray.500" fontSize="12px">
                                  执行中...
                                </Text>
                              ) : (
                                <Text color="gray.400" fontSize="12px">
                                  暂无输出
                                </Text>
                              )}
                            </Box>
                          </Flex>
                        </Collapse>
                      </Box>
                    </Flex>
                  );
                })}
              </Flex>
            ) : null}
            {content ? <Markdown source={content} /> : null}
          </Flex>
        )}
      </Box>

      <Modal isOpen={isDetailModalOpen} onClose={handleCloseDetailModal} size="xl">
        <ModalOverlay bg="blackAlpha.400" />
        <ModalContent>
          <ModalHeader fontSize="sm">{detailModalData?.title || "工具详情"}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4}>
            <Flex justify="flex-end" mb={2}>
              <Button
                colorScheme="blue"
                onClick={() => copyData(detailModalData?.content || "")}
                size="xs"
                variant="outline"
              >
                复制
              </Button>
            </Flex>
            <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="8px" maxH="60vh" overflow="auto" p={3}>
              <Text color="gray.800" fontFamily="mono" fontSize="12px" whiteSpace="pre-wrap">
                {detailModalData?.content || ""}
              </Text>
            </Box>
          </ModalBody>
        </ModalContent>
      </Modal>
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

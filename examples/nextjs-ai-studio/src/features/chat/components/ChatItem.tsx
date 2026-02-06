import { Box, Flex, Text } from "@chakra-ui/react";
import Markdown from "@/components/Markdown";
import { extractText } from "@shared/chat/messages";
import type { ConversationMessage } from "@/types/conversation";
import { useMemo } from "react";

const normalizeContent = (content: unknown) => {
  const text = extractText(content);
  return text ?? "";
};

const ChatItem = ({ message, isStreaming }: { message: ConversationMessage; isStreaming?: boolean }) => {
  const content = normalizeContent(message.content);
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isSystem = message.role === "system";

  if (!content.trim() && message.role !== "assistant") return null;

  const align = isUser ? "flex-end" : "flex-start";
  const bubbleBg = isUser ? "white" : isTool ? "orange.50" : isSystem ? "gray.100" : "gray.50";
  const borderColor = isUser ? "gray.200" : isTool ? "orange.200" : "gray.200";
  const radius = isUser ? "12px 0 12px 12px" : "0 12px 12px 12px";
  const showAvatar = false;

  const toolData = useMemo(() => {
    if (!isTool) return null;
    if (!content) {
      return { toolName: message.name || "工具", params: "", response: "" };
    }
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        const toolName =
          parsed.toolName || parsed.name || message.name || "工具";
        const params =
          typeof parsed.params === "string"
            ? parsed.params
            : parsed.params
            ? JSON.stringify(parsed.params, null, 2)
            : "";
        const response =
          typeof parsed.response === "string"
            ? parsed.response
            : parsed.response
            ? JSON.stringify(parsed.response, null, 2)
            : parsed.content
            ? String(parsed.content)
            : content;
        const toolAvatar = parsed.toolAvatar;
        return { toolName, params, response, toolAvatar };
      }
    } catch {
      // fall through
    }
    return {
      toolName: message.name || "工具",
      params: "",
      response: content
    };
  }, [content, isTool, message.name]);

  return (
    <Flex justify={align} w="full">
      <Flex
        gap={showAvatar ? 2 : 0}
        maxW="85%"
        align="flex-start"
        flexDirection={isUser ? "row-reverse" : "row"}
      >
        {showAvatar ? <Box pt={1} /> : null}
        <Box
          className="chat-message"
          border="1px solid"
          borderColor={borderColor}
          borderRadius={radius}
          bg={bubbleBg}
          px={4}
          py={3}
          fontSize="sm"
          color="gray.700"
          minW="120px"
        >
          {isTool && toolData ? (
            <Flex direction="column" gap={2}>
              <Text fontSize="xs" color="orange.700" fontWeight="600">
                工具：{toolData.toolName || "未知工具"}
              </Text>
              {toolData.params ? (
                <Box as="pre" fontSize="xs" whiteSpace="pre-wrap" color="gray.600" bg="white" p={2} borderRadius="md">
                  {toolData.params}
                </Box>
              ) : null}
              {toolData.response ? (
                <Markdown source={toolData.response} />
              ) : (
                <Text fontSize="xs" color="gray.500">等待工具返回结果...</Text>
              )}
            </Flex>
          ) : isSystem ? (
            <Text fontSize="xs" color="gray.500">
              {content}
            </Text>
          ) : (
            <Markdown source={content || (isStreaming ? "…" : "")} />
          )}
        </Box>
      </Flex>
    </Flex>
  );
};

export default ChatItem;

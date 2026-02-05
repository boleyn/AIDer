import { Box, Flex, Text } from "@chakra-ui/react";
import Markdown from "../../../components/Markdown";
import { extractText } from "../../../utils/agent/messages";
import type { ConversationMessage } from "../../../types/conversation";
import { useMemo } from "react";
import AIResponseBox from "../../../components/core/chat/components/AIResponseBox";
import { ChatItemValueTypeEnum } from "../../../global/core/chat/constants";
import type { AIChatItemValueItemType, ToolModuleResponseItemType } from "../../../global/core/chat/type";

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

  const aiValue: AIChatItemValueItemType | null = useMemo(() => {
    if (isTool && toolData) {
      const toolItem: ToolModuleResponseItemType = {
        id: toolData.toolName,
        toolName: toolData.toolName,
        toolAvatar: toolData.toolAvatar,
        params: toolData.params || "",
        response: toolData.response || "",
      };
      return {
        type: ChatItemValueTypeEnum.tool,
        tools: [toolItem],
      };
    }
    if (!isUser && !isSystem) {
      return {
        type: ChatItemValueTypeEnum.text,
        text: { content: content || "" },
      };
    }
    return null;
  }, [content, isTool, isUser, isSystem, toolData]);

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
          {aiValue ? (
            <AIResponseBox
              chatItemDataId={message.id || "chat-item"}
              value={aiValue}
              isLastResponseValue
              isChatting={Boolean(isStreaming)}
            />
          ) : isSystem ? (
            <Text fontSize="xs" color="gray.500">
              {content}
            </Text>
          ) : (
            <Markdown source={content || (isStreaming ? "…" : "")} showAnimation={Boolean(isStreaming)} />
          )}
        </Box>
      </Flex>
    </Flex>
  );
};

export default ChatItem;

import {
  Box,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";

import { AddIcon, ClockIcon, CloseIcon } from "@/components/common/Icon";
import type { ConversationSummary } from "@/types/conversation";

interface ChatHeaderProps {
  title?: string;
  model?: string;
  modelOptions?: Array<{ value: string; label: string }>;
  modelLoading?: boolean;
  onChangeModel?: (model: string) => void;
  conversations?: ConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onDeleteAllConversations?: () => void;
  onReset?: () => void;
  onNewConversation?: () => void;
}

const ChatHeader = ({
  title,
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onDeleteConversation,
  onDeleteAllConversations,
  onReset,
  onNewConversation,
}: ChatHeaderProps) => {
  return (
    <Flex
      align="center"
      justify="space-between"
      px={4}
      py={3}
      borderBottom="1px solid"
      borderColor="rgba(226,232,240,0.95)"
      bg="linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(248,250,252,0.7) 100%)"
      flexShrink={0}
    >
      <Box minW={0}>
        <Text color="myGray.800" fontSize="sm" fontWeight="800" isTruncated maxW="230px">
          {title || "Code Assistant"}
        </Text>
        <Text color="myGray.500" fontSize="xs" mt={0.5}>
          会话数 {conversations.length}
        </Text>
      </Box>

      <Flex gap={1}>
        <Menu placement="bottom-end">
          <MenuButton
            aria-label="Chat history"
            as={IconButton}
            icon={<ClockIcon />}
            size="sm"
            variant="ghost"
            borderRadius="10px"
            _hover={{ bg: "myGray.100" }}
          />
          <MenuList maxH="320px" minW="260px" overflowY="auto" borderColor="myGray.200" p={1}>
            {conversations.length === 0 ? (
              <MenuItem isDisabled borderRadius="md">暂无历史对话</MenuItem>
            ) : (
              conversations.map((conversation) => (
                <MenuItem
                  key={conversation.id}
                  borderRadius="md"
                  bg={conversation.id === activeConversationId ? "blue.50" : "transparent"}
                  onClick={() => onSelectConversation?.(conversation.id)}
                >
                  <Flex align="center" gap={2} justify="space-between" w="full">
                    <Text maxW="184px" isTruncated fontWeight={conversation.id === activeConversationId ? "700" : "500"}>
                      {conversation.title || "未命名对话"}
                    </Text>
                    <IconButton
                      aria-label="Delete conversation"
                      colorScheme="red"
                      icon={<CloseIcon />}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (window.confirm("确定要删除这条对话记录吗？")) {
                          onDeleteConversation?.(conversation.id);
                        }
                      }}
                      size="xs"
                      variant="ghost"
                    />
                  </Flex>
                </MenuItem>
              ))
            )}
            {conversations.length > 0 && (
              <MenuItem
                color="red.500"
                fontWeight="700"
                borderRadius="md"
                onClick={() => {
                  if (window.confirm("确定要清空所有历史记录吗？")) {
                    onDeleteAllConversations?.();
                  }
                }}
              >
                清空所有历史记录
              </MenuItem>
            )}
          </MenuList>
        </Menu>

        <IconButton
          aria-label="New chat"
          icon={<AddIcon />}
          onClick={onNewConversation ?? onReset}
          size="sm"
          borderRadius="10px"
          bg="white"
          border="1px solid"
          borderColor="myGray.200"
          _hover={{ bg: "myGray.100" }}
        />
      </Flex>
    </Flex>
  );
};

export default ChatHeader;

import {
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";

import { AddIcon, ClockIcon, CloseIcon, SettingsIcon } from "@/components/common/Icon";
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
  model,
  modelOptions = [],
  modelLoading,
  onChangeModel,
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
      bg="white"
      borderBottom="1px solid"
      borderColor="gray.200"
      justify="space-between"
      px={4}
      py={3}
    >
      <Text color="gray.700" fontSize="sm" fontWeight="600">
        {title || "Code assistant"}
      </Text>
      <Flex gap={1}>
        <Menu placement="bottom-end">
          <MenuButton
            aria-label="Model selector"
            as={IconButton}
            icon={<Text fontSize="xs">{model || "模型"}</Text>}
            isDisabled={modelLoading || modelOptions.length === 0}
            size="xs"
            variant="ghost"
          />
          <MenuList maxH="260px" minW="220px" overflowY="auto">
            {modelOptions.length === 0 ? (
              <MenuItem isDisabled>{modelLoading ? "加载模型中..." : "暂无可用模型"}</MenuItem>
            ) : (
              modelOptions.map((item) => (
                <MenuItem
                  key={item.value}
                  fontWeight={item.value === model ? "600" : "400"}
                  onClick={() => onChangeModel?.(item.value)}
                >
                  {item.label}
                </MenuItem>
              ))
            )}
          </MenuList>
        </Menu>
        <Menu placement="bottom-end">
          <MenuButton
            aria-label="Chat history"
            as={IconButton}
            icon={<ClockIcon />}
            size="xs"
            variant="ghost"
          />
          <MenuList maxH="320px" minW="240px" overflowY="auto">
            {conversations.length === 0 ? (
              <MenuItem isDisabled>暂无历史对话</MenuItem>
            ) : (
              conversations.map((conversation) => (
                <MenuItem
                  key={conversation.id}
                  fontWeight={
                    conversation.id === activeConversationId ? "600" : "400"
                  }
                  onClick={() => onSelectConversation?.(conversation.id)}
                >
                  <Flex align="center" gap={2} justify="space-between" w="full">
                    <Text maxW="180px" isTruncated>
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
                fontWeight="600"
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
          aria-label="Chat settings"
          icon={<SettingsIcon />}
          size="xs"
          variant="ghost"
        />
        <IconButton
          aria-label="New chat"
          icon={<AddIcon />}
          onClick={onNewConversation ?? onReset}
          size="xs"
          variant="ghost"
        />
      </Flex>
    </Flex>
  );
};

export default ChatHeader;

import {
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
} from "@chakra-ui/react";

import { AddIcon, ClockIcon, SettingsIcon } from "../../../components/common/Icon";
import type { ConversationSummary } from "../../../types/conversation";

type ChatHeaderProps = {
  title?: string;
  conversations?: ConversationSummary[];
  activeConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onReset?: () => void;
  onNewConversation?: () => void;
};

const ChatHeader = ({
  title,
  conversations = [],
  activeConversationId,
  onSelectConversation,
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
      borderColor="gray.200"
      bg="white"
    >
      <Text fontSize="sm" fontWeight="600" color="gray.700">
        {title || "Code assistant"}
      </Text>
      <Flex gap={1}>
        <Menu placement="bottom-end">
          <MenuButton
            as={IconButton}
            aria-label="Chat history"
            size="xs"
            variant="ghost"
            icon={<ClockIcon />}
          />
          <MenuList minW="240px" maxH="320px" overflowY="auto">
            {conversations.length === 0 ? (
              <MenuItem isDisabled>暂无历史对话</MenuItem>
            ) : (
              conversations.map((conversation) => (
                <MenuItem
                  key={conversation.id}
                  onClick={() => onSelectConversation?.(conversation.id)}
                  fontWeight={
                    conversation.id === activeConversationId ? "600" : "400"
                  }
                >
                  {conversation.title || "未命名对话"}
                </MenuItem>
              ))
            )}
          </MenuList>
        </Menu>
        <IconButton
          aria-label="Chat settings"
          size="xs"
          variant="ghost"
          icon={<SettingsIcon />}
        />
        <IconButton
          aria-label="New chat"
          size="xs"
          variant="ghost"
          onClick={onNewConversation ?? onReset}
          icon={<AddIcon />}
        />
      </Flex>
    </Flex>
  );
};

export default ChatHeader;

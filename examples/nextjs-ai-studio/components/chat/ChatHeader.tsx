import { Flex, IconButton, Text } from "@chakra-ui/react";

import { AddIcon, ClockIcon, SettingsIcon } from "../common/Icon";

type ChatHeaderProps = {
  onReset?: () => void;
};

const ChatHeader = ({ onReset }: ChatHeaderProps) => {
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
        Code assistant
      </Text>
      <Flex gap={1}>
        <IconButton
          aria-label="Chat history"
          size="xs"
          variant="ghost"
          icon={<ClockIcon />}
        />
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
          onClick={onReset}
          icon={<AddIcon />}
        />
      </Flex>
    </Flex>
  );
};

export default ChatHeader;

import { Flex, IconButton, Text } from "@chakra-ui/react";

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
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 6v6l4 2"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          }
        />
        <IconButton
          aria-label="Chat settings"
          size="xs"
          variant="ghost"
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 15a7.6 7.6 0 0 0 .1-2l2-1.2-2-3.5-2.3.8a7.7 7.7 0 0 0-1.7-1l-.3-2.4H9.8l-.3 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-.8-2 3.5 2 1.2a7.6 7.6 0 0 0 0 2l-2 1.2 2 3.5 2.3-.8a7.7 7.7 0 0 0 1.7 1l.3 2.4h4.2l.3-2.4a7.7 7.7 0 0 0 1.7-1l2.3.8 2-3.5-2-1.2Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <IconButton
          aria-label="New chat"
          size="xs"
          variant="ghost"
          onClick={onReset}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          }
        />
      </Flex>
    </Flex>
  );
};

export default ChatHeader;

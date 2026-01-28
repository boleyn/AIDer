import type { ReactNode } from "react";
import { Box, Text } from "@chakra-ui/react";

export type ChatMessageBubbleProps = {
  role: "user" | "assistant" | "system";
  children: ReactNode;
};

const roleStyles = {
  user: {
    bg: "white",
    borderColor: "gray.200",
  },
  assistant: {
    bg: "gray.50",
    borderColor: "gray.200",
  },
  system: {
    bg: "blue.50",
    borderColor: "blue.100",
  },
} as const;

const ChatMessageBubble = ({ role, children }: ChatMessageBubbleProps) => {
  const styles = roleStyles[role];

  return (
    <Box
      border="1px solid"
      borderColor={styles.borderColor}
      borderRadius="lg"
      bg={styles.bg}
      p={3}
      fontSize="sm"
      color="gray.700"
      lineHeight="1.5"
    >
      <Text as="div" whiteSpace="pre-wrap">
        {children}
      </Text>
    </Box>
  );
};

export default ChatMessageBubble;

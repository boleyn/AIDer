import { Box, Flex, Text } from "@chakra-ui/react";
import ChatMessageBubble from "./ChatMessageBubble";

const ChatMessages = () => {
  return (
    <Flex direction="column" gap={3} p={4} overflow="auto" flex="1" minH="0">
      <Box>
        <Text fontSize="xs" color="gray.500" mb={2} textTransform="uppercase" letterSpacing="0.08em">
          Today
        </Text>
        <ChatMessageBubble role="user">
          Create a calm, glassy UI with modals, cards, and motion.
        </ChatMessageBubble>
      </Box>
      <ChatMessageBubble role="assistant">
        Absolutely. I will craft the layout, animation, and reusable components. Expect a
        polished, glass-inspired finish with step-based navigation.
      </ChatMessageBubble>
      <ChatMessageBubble role="assistant">
        Implementation steps:
        <ol style={{ margin: "8px 0 0 18px" }}>
          <li>Refactor layout with a glass card shell.</li>
          <li>Build a stepper-driven flow and highlight states.</li>
          <li>Add motion, typography, and spacing polish.</li>
        </ol>
      </ChatMessageBubble>
      <ChatMessageBubble role="system">
        Project synced with components/ folder. Continue editing whenever you are ready.
      </ChatMessageBubble>
    </Flex>
  );
};

export default ChatMessages;

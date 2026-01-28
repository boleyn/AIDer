import { Flex, Text } from "@chakra-ui/react";
import { useEffect, useRef } from "react";

import ChatMessageBubble from "./ChatMessageBubble";
import type { ChatMessage } from "../../types/chat";

type ChatMessagesProps = {
  messages: ChatMessage[];
};

const ChatMessages = ({ messages }: ChatMessagesProps) => {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Flex direction="column" gap={3} p={4} overflow="auto" flex="1" minH="0">
      <Text fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="0.08em">
        Today
      </Text>
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} role={message.role}>
          {message.content}
        </ChatMessageBubble>
      ))}
      <div ref={endRef} />
    </Flex>
  );
};

export default ChatMessages;

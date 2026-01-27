import { Flex } from "@chakra-ui/react";

import ChatComposer from "./chat/ChatComposer";
import ChatHeader from "./chat/ChatHeader";
import ChatMessages from "./chat/ChatMessages";
import ChatSuggestions from "./chat/ChatSuggestions";

const ChatPanel = () => {
  return (
    <Flex
      as="aside"
      direction="column"
      minW="280px"
      w="32%"
      maxW="420px"
      flex="0 0 auto"
      minH="0"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      bg="whiteAlpha.900"
      boxShadow="sm"
    >
      <ChatHeader />
      <ChatMessages />
      <ChatSuggestions />
      <ChatComposer />
    </Flex>
  );
};

export default ChatPanel;

import { Button, Flex, IconButton, Input } from "@chakra-ui/react";
import { useCallback, useState } from "react";

import { AttachIcon, MicIcon } from "../common/Icon";

type ChatComposerProps = {
  onSend: (text: string) => void;
  isSending?: boolean;
};

const ChatComposer = ({ onSend, isSending = false }: ChatComposerProps) => {
  const [value, setValue] = useState("");

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }, [value, onSend]);

  return (
    <Flex direction="column" gap={2} px={4} pt={3} pb={4} borderTop="1px solid" borderColor="gray.200">
      <Input
        placeholder="Make changes, add new features, ask for anything"
        size="sm"
        borderRadius="full"
        bg="white"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            handleSend();
          }
        }}
      />
      <Flex align="center" justify="space-between">
        <Flex gap={2}>
          <IconButton
            aria-label="Attach"
            size="sm"
            variant="ghost"
            icon={<AttachIcon />}
          />
          <IconButton
            aria-label="Microphone"
            size="sm"
            variant="ghost"
            icon={<MicIcon />}
          />
        </Flex>
        <Button
          size="sm"
          colorScheme="blue"
          borderRadius="full"
          onClick={handleSend}
          isLoading={isSending}
        >
          Send
        </Button>
      </Flex>
    </Flex>
  );
};

export default ChatComposer;

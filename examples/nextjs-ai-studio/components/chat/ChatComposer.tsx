import { Button, Flex, IconButton, Input } from "@chakra-ui/react";
import { useCallback, useState } from "react";

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
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M7 12.5l6.5-6.5a3.5 3.5 0 1 1 5 5L10 19.5a5 5 0 0 1-7-7L14 1.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
          <IconButton
            aria-label="Microphone"
            size="sm"
            variant="ghost"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M5 12a7 7 0 0 0 14 0M12 19v3"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            }
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

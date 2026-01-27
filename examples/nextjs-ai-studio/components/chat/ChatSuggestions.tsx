import { Button, Flex, Text } from "@chakra-ui/react";

const suggestions = [
  "AI Features",
  "Add image upload",
  "Implement dark mode",
  "Add task prompts",
];

const ChatSuggestions = () => {
  return (
    <Flex direction="column" gap={2} px={4} pt={3} pb={3} borderTop="1px solid" borderColor="gray.200">
      <Flex align="center" justify="space-between">
        <Text fontSize="xs" fontWeight="600" color="gray.500">
          Suggestions
        </Text>
        <Text fontSize="xs" color="gray.400">
          x
        </Text>
      </Flex>
      <Flex gap={2} flexWrap="wrap">
        {suggestions.map((label) => (
          <Button key={label} size="xs" variant="outline" borderRadius="full">
            {label}
          </Button>
        ))}
      </Flex>
    </Flex>
  );
};

export default ChatSuggestions;

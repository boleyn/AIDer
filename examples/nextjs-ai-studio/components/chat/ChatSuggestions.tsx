import { Button, Flex, Text } from "@chakra-ui/react";

const suggestions = [
  "生成一个 React 组件模板",
  "帮我添加按钮交互",
  "帮我优化样式",
  "/global list",
];

type ChatSuggestionsProps = {
  onSelect: (value: string) => void;
};

const ChatSuggestions = ({ onSelect }: ChatSuggestionsProps) => {
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
          <Button
            key={label}
            size="xs"
            variant="outline"
            borderRadius="full"
            onClick={() => onSelect(label)}
          >
            {label}
          </Button>
        ))}
      </Flex>
    </Flex>
  );
};

export default ChatSuggestions;

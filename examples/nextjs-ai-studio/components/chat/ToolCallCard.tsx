import { Badge, Box, Flex, Stack, Text } from "@chakra-ui/react";
import { type ThreadMessage, TextMessagePartProvider, type ToolCallMessagePartComponent } from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

const MarkdownTextFromString = ({ text }: { text: string }) => (
  <TextMessagePartProvider text={text}>
    <MarkdownTextPrimitive className="assistant-markdown" />
  </TextMessagePartProvider>
);

const readTextFromThreadMessage = (message: ThreadMessage): string[] => {
  return message.content.flatMap((part) => {
    if (part && typeof part === "object" && "text" in part && typeof part.text === "string") {
      return [part.text];
    }
    return [];
  });
};

const readTextFromValue = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(readTextFromValue);
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.message === "string") {
      return [record.message];
    }
    if (typeof record.text === "string") {
      return [record.text];
    }
    if (typeof record.content === "string") {
      return [record.content];
    }
    if (Array.isArray(record.messages)) {
      return record.messages.flatMap(readTextFromValue);
    }
    if (Array.isArray(record.content)) {
      return record.content.flatMap(readTextFromValue);
    }
  }
  return [];
};

const toJsonBlock = (value: unknown) => {
  if (value === undefined) {
    return "暂无数据。";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return `\`\`\`json\n${text}\n\`\`\``;
};

export const ToolCallCard: ToolCallMessagePartComponent = ({
  toolName,
  args,
  argsText,
  result,
  isError,
  status,
  messages,
}) => {
  const outputMessages = [
    ...(messages ? messages.flatMap(readTextFromThreadMessage) : []),
    ...readTextFromValue(result),
  ].filter((text) => text.trim().length > 0);

  const argsMarkdown = toJsonBlock(argsText?.trim() ? argsText : args);

  return (
    <Box as="details" className="assistant-tool" open={false}>
      <Box as="summary" className="assistant-tool-summary">
        <Flex align="center" gap={2}>
          <Text fontSize="sm" fontWeight="600" color="gray.700">
            工具调用：{toolName}
          </Text>
          {status?.type === "running" ? (
            <Badge colorScheme="blue">运行中</Badge>
          ) : isError ? (
            <Badge colorScheme="red">失败</Badge>
          ) : (
            <Badge colorScheme="green">完成</Badge>
          )}
        </Flex>
        <Text fontSize="xs" color="gray.500">
          点击展开
        </Text>
      </Box>
      <Box className="assistant-tool-body">
        <Box className="assistant-tool-card">
          <Text className="assistant-tool-title">输入</Text>
          <MarkdownTextFromString text={argsMarkdown} />
        </Box>
        <Box className="assistant-tool-card">
          <Text className="assistant-tool-title">输出</Text>
          {outputMessages.length > 0 ? (
            <Stack spacing={3}>
              {outputMessages.map((message, index) => (
                <MarkdownTextFromString key={`${toolName}-message-${index}`} text={message} />
              ))}
            </Stack>
          ) : (
            <MarkdownTextFromString text={toJsonBlock(result ?? "暂无输出。")} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

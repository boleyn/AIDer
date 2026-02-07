import {
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  Select,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { createId } from "@shared/chat/messages";
import { useCallback, useMemo, useRef, useState } from "react"; 

import type { ChatInputFile, ChatInputProps, ChatInputSubmitPayload } from "../types/chatInput";

const formatFileSize = (size: number) => {
  if (size < 1024) return `${size} B`;
  const kb = size / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
};

const ChatInput = ({
  isSending,
  model,
  modelOptions,
  modelLoading,
  onChangeModel,
  onSend,
}: ChatInputProps) => {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<ChatInputFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(
    () => !isSending && (text.trim().length > 0 || files.length > 0),
    [files.length, isSending, text]
  );

  const onPickFiles = useCallback((picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    const next = Array.from(picked).map((file) => ({
      id: createId(),
      file,
    }));
    setFiles((prev) => [...prev, ...next]);
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;

    const payload: ChatInputSubmitPayload = {
      text: text.trim(),
      files,
    };

    await onSend(payload);
    setText("");
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [canSend, files, onSend, text]);

  return (
    <Flex
      direction="column"
      gap={3}
      px={4}
      py={3}
      bg="rgba(255,255,255,0.9)"
      borderTop="1px solid rgba(226,232,240,0.9)"
    >
      <Flex align="center" justify="space-between" gap={2}>
        <Text fontSize="xs" color="myGray.500" fontWeight="600" letterSpacing="0.02em">
          当前模型
        </Text>
        <Select
          size="sm"
          maxW="220px"
          value={model}
          onChange={(event) => onChangeModel(event.target.value)}
          isDisabled={modelLoading || isSending || modelOptions.length === 0}
          bg="white"
          borderColor="myGray.250"
        >
          {modelOptions.length === 0 ? (
            <option value="agent">{modelLoading ? "加载模型中..." : "暂无可用模型"}</option>
          ) : (
            modelOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))
          )}
        </Select>
      </Flex>

      {files.length > 0 ? (
        <Box
          border="1px solid"
          borderColor="myGray.200"
          borderRadius="md"
          bg="white"
          px={2}
          py={2}
        >
          <Flex wrap="wrap" gap={2}>
            {files.map((item) => (
              <Tag key={item.id} size="sm" borderRadius="full" variant="subtle" colorScheme="blue">
                <TagLabel maxW="210px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {item.file.name} ({formatFileSize(item.file.size)})
                </TagLabel>
                <TagCloseButton
                  onClick={() => {
                    setFiles((prev) => prev.filter((f) => f.id !== item.id));
                  }}
                />
              </Tag>
            ))}
          </Flex>
        </Box>
      ) : null}

      <Flex gap={2} align="flex-end">
        <Textarea
          isDisabled={isSending}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入你的问题，按 Enter 发送，Shift + Enter 换行"
          value={text}
          rows={2}
          resize="none"
          bg="white"
          borderColor="myGray.250"
          _focusVisible={{
            borderColor: "primary.400",
            boxShadow: "0 0 0 1px rgba(51,112,255,0.35)",
          }}
        />

        <Flex direction="column" gap={2}>
          <Input
            ref={fileInputRef}
            type="file"
            multiple
            display="none"
            onChange={(event) => onPickFiles(event.target.files)}
          />
          <IconButton
            aria-label="选择文件"
            icon={<Text fontSize="lg" lineHeight="1">+</Text>}
            h="42px"
            minW="42px"
            variant="outline"
            borderColor="myGray.250"
            onClick={() => fileInputRef.current?.click()}
            isDisabled={isSending}
          />
          <Button
            isLoading={isSending}
            onClick={handleSend}
            h="42px"
            minW="74px"
            color="white"
            bgGradient="linear(to-r, blue.500, cyan.500)"
            _hover={{ filter: "brightness(1.06)" }}
            _active={{ filter: "brightness(0.98)" }}
            isDisabled={!canSend}
          >
            发送
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ChatInput;

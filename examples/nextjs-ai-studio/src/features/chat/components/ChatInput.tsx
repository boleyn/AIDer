import {
  Box,
  CloseButton,
  Flex,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { getFileIcon } from "@fastgpt/global/common/file/icon";
import { createId } from "@shared/chat/messages";
import { useTranslation } from "next-i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ChatInputFile, ChatInputProps, ChatInputSubmitPayload } from "../types/chatInput";

const ChatInput = ({
  isSending,
  model,
  modelOptions,
  modelLoading,
  onChangeModel,
  onSend,
  onStop,
}: ChatInputProps) => {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<ChatInputFile[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canSend = useMemo(
    () => !isSending && !isSubmitting && (text.trim().length > 0 || files.length > 0),
    [files.length, isSending, isSubmitting, text]
  );
  const selectedModelOption = useMemo(
    () => modelOptions.find((item) => item.value === model),
    [model, modelOptions]
  );
  const previewFiles = useMemo(
    () =>
      files.map((item) => {
        const icon = getFileIcon(item.file.name);
        const isImage = item.file.type.startsWith("image/") || icon === "image";
        return {
          ...item,
          icon,
          isImage,
          previewUrl: isImage ? URL.createObjectURL(item.file) : "",
        };
      }),
    [files]
  );

  useEffect(() => {
    return () => {
      previewFiles.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [previewFiles]);

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

    setIsSubmitting(true);
    try {
      await onSend(payload);
      setText("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setIsSubmitting(false);
    }
  }, [canSend, files, onSend, text]);

  return (
    <Box bg="white" px={4} py={3}>
      <Flex
        bg="white"
        border="0.5px solid"
        borderColor={isFocused ? "rgba(0,0,0,0.24)" : "rgba(0,0,0,0.18)"}
        borderRadius="18px"
        boxShadow={
          isFocused
            ? "0px 5px 20px -4px rgba(19, 51, 107, 0.13)"
            : "0px 5px 16px -4px rgba(19, 51, 107, 0.08)"
        }
        direction="column"
        minH="108px"
        overflow="hidden"
      >
        {previewFiles.length > 0 ? (
          <Flex gap="6px" mb={2} pt={2} px={3} userSelect="none" wrap="wrap">
            {previewFiles.map((item) => (
              <Box
                key={item.id}
                aspectRatio={item.isImage ? 1 : 4}
                maxW={item.isImage ? "56px" : "224px"}
                w={item.isImage ? "12.5%" : "calc(50% - 3px)"}
              >
                <Box
                  _hover={{ ".file-preview-close": { display: "block" } }}
                  alignItems="center"
                  border="1px solid #E2E8F0"
                  borderRadius="8px"
                  boxShadow="0px 2.571px 6.429px 0px rgba(19, 51, 107, 0.08), 0px 0px 0.643px 0px rgba(19, 51, 107, 0.08)"
                  h="100%"
                  pl={item.isImage ? 0 : 2}
                  position="relative"
                  w="100%"
                >
                  <CloseButton
                    bg="white"
                    borderRadius="999px"
                    className="file-preview-close"
                    display={["block", "none"]}
                    onClick={() => setFiles((prev) => prev.filter((f) => f.id !== item.id))}
                    position="absolute"
                    right="-8px"
                    size="sm"
                    top="-8px"
                    zIndex={10}
                  />
                  {item.isImage ? (
                    <Box
                      alt={item.file.name}
                      as="img"
                      borderRadius="8px"
                      h="100%"
                      objectFit="contain"
                      src={item.previewUrl}
                      w="100%"
                    />
                  ) : (
                    <Flex align="center" gap={2} h="100%" pr={2}>
                      <Box as="img" h="24px" src={`/icons/chat/${item.icon}.svg`} w="24px" />
                      <Text className="textEllipsis" fontSize="xs" noOfLines={1}>
                        {item.file.name}
                      </Text>
                    </Flex>
                  )}
                </Box>
              </Box>
            ))}
          </Flex>
        ) : null}

        <Flex align="center" px={2}>
          <Textarea
            _focusVisible={{ border: "none", boxShadow: "none" }}
            _placeholder={{
              color: "#707070",
              fontSize: "13px",
            }}
            border="none"
            color="myGray.900"
            fontSize="1rem"
            fontWeight={400}
            lineHeight="1.5"
            maxH="128px"
            mb={0}
            minH="50px"
            onBlur={() => setIsFocused(false)}
            onChange={(event) => {
              setText(event.target.value);
              const textarea = event.target;
              textarea.style.height = "50px";
              const nextHeight = Math.min(textarea.scrollHeight, 128);
              textarea.style.height = `${nextHeight}px`;
              textarea.style.overflowY = textarea.scrollHeight > 128 ? "auto" : "hidden";
            }}
            onCompositionEnd={() => setIsComposing(false)}
            onCompositionStart={() => setIsComposing(true)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                if (isComposing) return;
                event.preventDefault();
                handleSend();
              }
            }}
            overflowX="hidden"
            overflowY="hidden"
            placeholder={t("chat:input_placeholder", {
              defaultValue: "输入你的问题，按 Enter 发送，Shift + Enter 换行",
            })}
            px={2}
            resize="none"
            rows={1}
            value={text}
            w="100%"
            whiteSpace="pre-wrap"
          />
        </Flex>

        <Flex align="center" h="44px" justify="space-between" pb={2} pl={3} pr={3}>
          <Flex align="center" gap={2} minW={0}>
            <Menu placement="top-start" isLazy>
              <MenuButton
                _hover={{ bg: "rgba(0, 0, 0, 0.04)" }}
                aria-label={t("chat:tool_call_model", { defaultValue: "工具调用模型" })}
                as={IconButton}
                borderRadius="8px"
                h="30px"
                icon={
                  selectedModelOption?.icon ? (
                    <Box
                      alt={selectedModelOption.label}
                      as="img"
                      borderRadius="999px"
                      h="18px"
                      objectFit="cover"
                      src={selectedModelOption.icon}
                      w="18px"
                    />
                  ) : (
                    <Text color="#64748B" fontSize="14px" lineHeight="1">
                      AI
                    </Text>
                  )
                }
                isDisabled={modelLoading || isSending || isSubmitting || modelOptions.length === 0}
                minW="30px"
                variant="ghost"
              />
              <MenuList maxH="240px" minW="220px" overflowY="auto" py={1}>
                {modelOptions.length === 0 ? (
                  <MenuItem isDisabled>
                    {modelLoading
                      ? t("chat:model_loading", { defaultValue: "加载模型中..." })
                      : t("chat:model_empty", { defaultValue: "暂无可用模型" })}
                  </MenuItem>
                ) : (
                  modelOptions.map((item) => (
                    <MenuItem
                      key={item.value}
                      bg={item.value === model ? "#EFF6FF" : "transparent"}
                      onClick={() => onChangeModel(item.value)}
                    >
                      <Flex align="center" gap={2} minW={0}>
                        {item.icon ? (
                          <Box
                            alt={item.label}
                            as="img"
                            borderRadius="999px"
                            h="18px"
                            objectFit="cover"
                            src={item.icon}
                            w="18px"
                          />
                        ) : (
                          <Box
                            alignItems="center"
                            bg="#E2E8F0"
                            borderRadius="999px"
                            color="#475569"
                            display="flex"
                            fontSize="10px"
                            h="18px"
                            justifyContent="center"
                            textTransform="uppercase"
                            w="18px"
                          >
                            {item.label.slice(0, 1)}
                          </Box>
                        )}
                        <Text className="textEllipsis" fontSize="sm">
                          {item.label}
                        </Text>
                      </Flex>
                    </MenuItem>
                  ))
                )}
              </MenuList>
            </Menu>
          </Flex>

          <Flex align="center" gap={1}>
            <Input
              ref={fileInputRef}
              display="none"
              onChange={(event) => onPickFiles(event.target.files)}
              type="file"
              multiple
            />
            <Flex
              _hover={{ bg: "rgba(0, 0, 0, 0.04)" }}
              align="center"
              borderRadius="6px"
              cursor={isSending || isSubmitting ? "not-allowed" : "pointer"}
              h="36px"
              justify="center"
              onClick={() => {
                if (isSending || isSubmitting) return;
                fileInputRef.current?.click();
              }}
              w="36px"
            >
              <Box alt="attach" as="img" h="16px" opacity={0.75} src="/icons/chat/fileSelect.svg" w="16px" />
            </Flex>

            <Box bg="myGray.200" h="20px" mx={1} w="2px" />

            <IconButton
              _hover={{ bg: isSending ? "primary.100" : canSend ? "#2563EB" : "rgba(17, 24, 36, 0.1)" }}
              aria-label={
                isSending
                  ? t("chat:stop_generating", { defaultValue: "停止生成" })
                  : t("common:Send", { defaultValue: "发送" })
              }
              bg={isSending ? "primary.50" : canSend ? "primary.500" : "rgba(17, 24, 36, 0.1)"}
              borderRadius="12px"
              h="36px"
              icon={
                <Box
                  as="img"
                  h="18px"
                  src={isSending ? "/icons/chat/stop.svg" : "/icons/chat/sendFill.svg"}
                  sx={{
                    filter: isSending ? "none" : "brightness(0) invert(1)",
                  }}
                  w="18px"
                />
              }
              isDisabled={!isSending && !canSend}
              onClick={() => {
                if (isSending) {
                  onStop?.();
                  return;
                }
                handleSend();
              }}
              type="button"
              w="36px"
            />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export default ChatInput;

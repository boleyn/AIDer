import { Flex } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";

import ChatComposer from "./chat/ChatComposer";
import ChatHeader from "./chat/ChatHeader";
import ChatMessages from "./chat/ChatMessages";
import ChatSuggestions from "./chat/ChatSuggestions";
import type { ChatMessage } from "../types/chat";

type ChatPanelProps = {
  token: string;
  onFilesUpdated?: (files: Record<string, { code: string }>) => void;
};

const createMessage = (role: ChatMessage["role"], content: string): ChatMessage => ({
  id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
  role,
  content,
  createdAt: new Date().toISOString(),
});

const ChatPanel = ({ token, onFilesUpdated }: ChatPanelProps) => {
  const { sandpack } = useSandpack();
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "你好！我可以帮你编写和修改代码。你也可以使用 /global 指令查看文件，比如：/global list 或 /global {\"action\":\"read\",\"path\":\"/App.js\"}"
    ),
  ]);
  const [isSending, setIsSending] = useState(false);

  const appendMessages = useCallback((next: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...next]);
  }, []);

  const handleAgentResponse = useCallback(
    (data: { message?: string; error?: string; updatedFiles?: Record<string, { code: string }> }) => {
      if (data.error) {
        appendMessages([createMessage("system", data.error)]);
      }
      if (data.message) {
        appendMessages([createMessage("assistant", data.message)]);
      }
      if (data.updatedFiles) {
        Object.entries(data.updatedFiles).forEach(([path, file]) => {
          sandpack.updateFile(path, file.code);
        });
        onFilesUpdated?.(data.updatedFiles);
        appendMessages([
          createMessage(
            "system",
            `已同步 ${Object.keys(data.updatedFiles).length} 个文件到编辑器。`
          ),
        ]);
      }
    },
    [appendMessages, sandpack, onFilesUpdated]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!token) return;
      const userMessage = createMessage("user", text);
      appendMessages([userMessage]);
      setIsSending(true);
      try {
        const response = await fetch(`/api/agent?token=${encodeURIComponent(token)}&stream=1`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            messages: [...messages, userMessage].map((message) => ({
              role: message.role,
              content: message.content,
            })),
            stream: true,
          }),
        });
        if (!response.ok) {
          const data = (await response.json()) as {
            message?: string;
            error?: string;
          };
          if (!data.error) {
            data.error = `请求失败 (${response.status})`;
          }
          handleAgentResponse(data);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          const data = (await response.json()) as {
            message?: string;
            error?: string;
            updatedFiles?: Record<string, { code: string }>;
          };
          handleAgentResponse(data);
          return;
        }

        const assistantMessageId =
          typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        appendMessages([
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            createdAt: new Date().toISOString(),
          },
        ]);
        let buffer = "";
        let currentText = "";

        const updateStreamingMessage = (delta: string) => {
          currentText += delta;
          setMessages((prev) =>
            prev.map((item) =>
              item.id === assistantMessageId ? { ...item, content: currentText } : item
            )
          );
        };

        const decoder = new TextDecoder();
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split("\n\n");
            buffer = parts.pop() || "";
            for (const part of parts) {
              const lines = part.split("\n");
              let eventName = "message";
              let dataLine = "";
              for (const line of lines) {
                if (line.startsWith("event:")) {
                  eventName = line.replace("event:", "").trim();
                } else if (line.startsWith("data:")) {
                  dataLine = line.replace("data:", "").trim();
                }
              }
              if (!dataLine) continue;
              const payload = JSON.parse(dataLine) as {
                delta?: string;
                message?: string;
                updatedFiles?: Record<string, { code: string }>;
                error?: string;
              };
              if (eventName === "delta" && payload.delta) {
                updateStreamingMessage(payload.delta);
              } else if (eventName === "message") {
                if (payload.message && payload.message !== currentText) {
                  updateStreamingMessage(payload.message);
                }
                if (payload.updatedFiles) {
                  handleAgentResponse(payload);
                }
              } else if (eventName === "error") {
                handleAgentResponse({ error: payload.error || "请求失败" });
              } else if (eventName === "done") {
                done = true;
              }
            }
          }
        }
      } catch (error) {
        appendMessages([
          createMessage("system", error instanceof Error ? error.message : "请求失败"),
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [appendMessages, handleAgentResponse, messages, token]
  );

  const handleReset = useCallback(() => {
    setMessages([
      createMessage(
        "assistant",
        "新的对话已开启。告诉我你想做什么，或使用 /global 指令进行文件操作。"
      ),
    ]);
  }, []);

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
      <ChatHeader onReset={handleReset} />
      <ChatMessages messages={messages} />
      <ChatSuggestions onSelect={sendMessage} />
      <ChatComposer onSend={sendMessage} isSending={isSending} />
    </Flex>
  );
};

export default ChatPanel;

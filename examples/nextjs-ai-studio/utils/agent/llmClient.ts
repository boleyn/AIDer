import type { AgentMessage, AgentToolCall } from "./messages";
import type { AgentToolDefinition } from "./tools/types";
import { createChatCompletion as openaiCompletion, type OpenAIClientConfig } from "./openaiClient";

export type LlmProvider = "openai" | "google" | string;

export type LlmClientConfig = OpenAIClientConfig & {
  provider: LlmProvider;
};

export type ChatCompletionResponse = {
  message: AgentMessage;
  finishReason?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

const GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com";

const buildGoogleUrl = (model: string, apiKey: string, baseUrl?: string) => {
  const root = baseUrl?.trim() || GOOGLE_BASE_URL;
  return `${root.replace(/\/$/, "")}/v1beta/models/${model}:generateContent?key=${apiKey}`;
};

const toGoogleContents = (messages: AgentMessage[]) => {
  return messages
    .filter((message) => message.role !== "system")
    .map((message) => {
      if (message.role === "tool") {
        const name = message.name || "tool";
        let response: Record<string, unknown> = {};
        if (typeof message.content === "string") {
          try {
            response = JSON.parse(message.content) as Record<string, unknown>;
          } catch {
            response = { result: message.content };
          }
        }
        return {
          role: "function",
          parts: [
            {
              functionResponse: {
                name,
                response,
              },
            },
          ],
        };
      }

      const parts: Array<Record<string, unknown>> = [];
      if (message.content) {
        parts.push({ text: message.content });
      }
      if (message.tool_calls && message.tool_calls.length > 0) {
        message.tool_calls.forEach((call) => {
          let args: Record<string, unknown> = {};
          if (call.function.arguments) {
            try {
              args = JSON.parse(call.function.arguments) as Record<string, unknown>;
            } catch {
              args = {};
            }
          }
          parts.push({
            functionCall: {
              name: call.function.name,
              args,
            },
          });
        });
      }
      return {
        role: message.role === "assistant" ? "model" : "user",
        parts,
      };
    });
};

const parseGoogleResponse = (payload: any): ChatCompletionResponse => {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  let text = "";
  const toolCalls: AgentToolCall[] = [];

  parts.forEach((part: any) => {
    if (part?.text) {
      text += part.text;
    }
    if (part?.functionCall) {
      const call = part.functionCall;
      const id = `call_${Math.random().toString(36).slice(2)}`;
      toolCalls.push({
        id,
        type: "function",
        function: {
          name: call.name,
          arguments: JSON.stringify(call.args ?? {}),
        },
      });
    }
  });

  return {
    message: {
      role: "assistant",
      content: text,
      tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
    },
    finishReason: candidate?.finishReason,
  };
};

const createGoogleCompletion = async ({
  config,
  messages,
  tools,
}: {
  config: LlmClientConfig;
  messages: AgentMessage[];
  tools?: AgentToolDefinition[];
}): Promise<ChatCompletionResponse> => {
  const systemMessage = messages.find((message) => message.role === "system");
  const contents = toGoogleContents(messages);

  const response = await fetch(buildGoogleUrl(config.model, config.apiKey, config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: systemMessage?.content
        ? { role: "system", parts: [{ text: systemMessage.content }] }
        : undefined,
      contents,
      tools: tools?.length
        ? [
            {
              functionDeclarations: tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              })),
            },
          ]
        : undefined,
      generationConfig: {
        temperature: config.temperature,
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    const message = payload?.error?.message || `Google 请求失败: ${response.status}`;
    throw new Error(message);
  }

  return parseGoogleResponse(payload);
};

export async function createChatCompletion({
  config,
  messages,
  tools,
  toolChoice,
  parallelToolCalls,
  maxTokens,
}: {
  config: LlmClientConfig;
  messages: AgentMessage[];
  tools?: AgentToolDefinition[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  parallelToolCalls?: boolean;
  maxTokens?: number;
}): Promise<ChatCompletionResponse> {
  if (config.provider === "google") {
    return createGoogleCompletion({ config, messages, tools });
  }

  return openaiCompletion({
    config,
    messages,
    tools,
    toolChoice,
    parallelToolCalls,
    maxTokens,
  });
}

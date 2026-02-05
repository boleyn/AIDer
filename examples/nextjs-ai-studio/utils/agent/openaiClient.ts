import type { AgentMessage, AgentToolCall } from "./messages";
import type { AgentToolDefinition } from "./tools/types";

export type OpenAIClientConfig = {
  apiKey: string;
  baseUrl?: string;
  model: string;
  temperature: number;
};

export type ChatCompletionResponse = {
  message: AgentMessage;
  finishReason?: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
};

const DEFAULT_BASE_URL = process.env.AIPROXY_API_ENDPOINT
  ? `${process.env.AIPROXY_API_ENDPOINT.replace(/\/$/, "")}/v1`
  : process.env.OPENAI_BASE_URL || "";

const buildUrl = (baseUrl?: string) => {
  const root = baseUrl?.trim() || DEFAULT_BASE_URL;
  if (!root) {
    throw new Error("缺少 AIPROXY_API_ENDPOINT/OPENAI_BASE_URL，无法调用模型。 ");
  }
  const normalized = root.replace(/\/$/, "");
  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
};

export async function createChatCompletion({
  config,
  messages,
  tools,
  toolChoice,
  parallelToolCalls,
  maxTokens,
}: {
  config: OpenAIClientConfig;
  messages: AgentMessage[];
  tools?: AgentToolDefinition[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  parallelToolCalls?: boolean;
  maxTokens?: number;
}): Promise<ChatCompletionResponse> {
  const response = await fetch(buildUrl(config.baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: config.temperature,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content ?? null,
        name: message.name,
        tool_calls: message.tool_calls,
        tool_call_id: message.tool_call_id,
      })),
      tools: tools?.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: toolChoice ?? "auto",
      parallel_tool_calls: parallelToolCalls ?? true,
      ...(maxTokens ? { max_tokens: maxTokens } : {}),
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | {
        choices?: Array<{
          message?: AgentMessage & { tool_calls?: AgentToolCall[] };
          finish_reason?: string;
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        error?: { message?: string };
      }
    | null;

  if (!response.ok || !payload || !payload.choices?.[0]?.message) {
    const message = payload?.error?.message || `OpenAI 请求失败: ${response.status}`;
    throw new Error(message);
  }

  const choice = payload.choices[0];
  return {
    message: choice.message,
    finishReason: choice.finish_reason,
    usage: payload.usage,
  };
}

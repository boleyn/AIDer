export type AichatApiConfig = {
  baseUrl: string;
  apiKey: string;
};

const aiProxyBaseUrl = process.env.AIPROXY_API_ENDPOINT
  ? `${process.env.AIPROXY_API_ENDPOINT.replace(/\/$/, "")}/v1`
  : undefined;
const openaiBaseUrl = aiProxyBaseUrl || process.env.OPENAI_BASE_URL || "";
const openaiBaseKey = process.env.AIPROXY_API_TOKEN || process.env.CHAT_API_KEY || "";

type OpenAICompat = {
  baseURL?: string;
  baseUrl?: string;
  chat: {
    completions: {
      create: (body: any, options?: { headers?: Record<string, string>; path?: string }) => Promise<any>;
    };
  };
};

const buildUrl = (baseUrl: string, path?: string) => {
  const normalized = baseUrl.replace(/\/$/, "");
  if (path) {
    return `${normalized}${path.startsWith("/") ? "" : "/"}${path}`;
  }
  if (normalized.endsWith("/v1")) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
};

const createOpenAICompat = (config: AichatApiConfig): OpenAICompat => {
  return {
    baseURL: config.baseUrl,
    baseUrl: config.baseUrl,
    chat: {
      completions: {
        create: async (body: any, options?: { headers?: Record<string, string>; path?: string }) => {
          const response = await fetch(buildUrl(config.baseUrl, options?.path), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.apiKey}`,
              ...(options?.headers || {})
            },
            body: JSON.stringify(body)
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            throw new Error(errorText || `请求失败: ${response.status}`);
          }

          if (body?.stream) {
            const reader = response.body?.getReader();
            if (!reader) throw new Error("空响应");
            const decoder = new TextDecoder();
            const asyncIterable = {
              async *[Symbol.asyncIterator]() {
                let buffer = "";
                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  if (!value) continue;
                  buffer += decoder.decode(value, { stream: true });
                  const parts = buffer.split("\\n\\n");
                  buffer = parts.pop() || "";
                  for (const part of parts) {
                    const lines = part.split("\\n");
                    const dataLines: string[] = [];
                    for (const line of lines) {
                      if (line.startsWith("data:")) {
                        dataLines.push(line.replace("data:", "").trim());
                      }
                    }
                    const data = dataLines.join("\\n");
                    if (!data || data === "[DONE]") continue;
                    try {
                      yield JSON.parse(data);
                    } catch {
                      continue;
                    }
                  }
                }
              }
            } as AsyncIterable<any> & { controller?: AbortController };
            return asyncIterable;
          }

          return response.json();
        }
      }
    }
  };
};

export const getAIApi = () => {
  const baseUrl = openaiBaseUrl;
  const apiKey = openaiBaseKey;
  if (!baseUrl) {
    throw new Error("AIPROXY_API_ENDPOINT/OPENAI_BASE_URL 未配置");
  }
  if (!apiKey) {
    throw new Error("AIPROXY_API_TOKEN/CHAT_API_KEY 未配置");
  }
  return createOpenAICompat({ baseUrl, apiKey });
};

export const getAxiosConfig = () => {
  const baseUrl = openaiBaseUrl;
  const apiKey = openaiBaseKey;
  if (!baseUrl) {
    throw new Error("AIPROXY_API_ENDPOINT/OPENAI_BASE_URL 未配置");
  }
  if (!apiKey) {
    throw new Error("AIPROXY_API_TOKEN/CHAT_API_KEY 未配置");
  }
  return {
    baseUrl,
    authorization: `Bearer ${apiKey}`
  };
};

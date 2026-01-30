import type { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { ChatOpenAI } from "@langchain/openai";

export type ModelCacheParams = {
  provider: string;
  openaiKey?: string;
  openaiBaseUrl?: string;
  openaiModelName: string;
  googleKey?: string;
  googleBaseUrl?: string;
  googleModelName: string;
  temperature: number;
};

type CachedModel = ChatOpenAI | ChatGoogleGenerativeAI;

const modelCache = new Map<string, Promise<CachedModel>>();

const buildModelCacheKey = (params: ModelCacheParams) =>
  JSON.stringify({
    provider: params.provider,
    temperature: params.temperature,
    openaiModelName: params.openaiModelName,
    openaiBaseUrl: params.openaiBaseUrl || "",
    openaiKey: params.openaiKey ? "set" : "missing",
    googleModelName: params.googleModelName,
    googleBaseUrl: params.googleBaseUrl || "",
    googleKey: params.googleKey ? "set" : "missing",
  });

export async function getCachedModel(params: ModelCacheParams) {
  const cacheKey = buildModelCacheKey(params);
  const existing = modelCache.get(cacheKey);
  if (existing) {
    return existing;
  }

  const modelPromise = (async () => {
    if (params.provider === "google") {
      const { ChatGoogleGenerativeAI } = await import("@langchain/google-genai");
      return new ChatGoogleGenerativeAI({
        apiKey: params.googleKey,
        model: params.googleModelName,
        temperature: params.temperature,
        baseUrl: params.googleBaseUrl || undefined,
      });
    }

    const { ChatOpenAI } = await import("@langchain/openai");
    return new ChatOpenAI({
      apiKey: params.openaiKey,
      model: params.openaiModelName,
      temperature: params.temperature,
      configuration: params.openaiBaseUrl
        ? { baseURL: params.openaiBaseUrl }
        : undefined,
    });
  })();

  modelCache.set(cacheKey, modelPromise);
  return modelPromise;
}

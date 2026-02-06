import { getAgentRuntimeConfig } from "@server/agent/runtimeConfig";

export interface ChatModelOption {
  id: string;
  label: string;
  source: "aiproxy" | "env";
}

export interface ChatModelCatalog {
  models: ChatModelOption[];
  defaultModel: string;
  source: "aiproxy" | "env";
  fetchedAt: string;
  warning?: string;
}

const CACHE_TTL_MS = 60 * 1000;

let modelCatalogCache:
  | {
      expiresAt: number;
      value: ChatModelCatalog;
    }
  | undefined;

const uniq = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const toModelsEndpoint = (baseUrl: string) => {
  const trimmed = baseUrl.trim().replace(/\/$/, "");
  const withoutChatCompletions = trimmed.endsWith("/chat/completions")
    ? trimmed.slice(0, -"/chat/completions".length)
    : trimmed;

  if (/\/v\d+$/.test(withoutChatCompletions)) {
    return `${withoutChatCompletions}/models`;
  }

  return `${withoutChatCompletions}/v1/models`;
};

const getEnvCandidateModels = () => {
  const runtime = getAgentRuntimeConfig();
  return uniq([
    runtime.toolCallModel,
    runtime.normalModel,
    process.env.OPENAI_MODEL || "",
    process.env.AI_MODEL || "",
    process.env.MODEL || "",
  ]);
};

const toModelIds = (payload: unknown): string[] => {
  const asArray = (() => {
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") {
      const record = payload as Record<string, unknown>;
      if (Array.isArray(record.data)) return record.data;
      if (Array.isArray(record.models)) return record.models;
      if (record.data && typeof record.data === "object") {
        const dataRecord = record.data as Record<string, unknown>;
        if (Array.isArray(dataRecord.models)) return dataRecord.models;
      }
    }
    return [];
  })();

  return uniq(
    asArray
      .map((item) => {
        if (typeof item === "string") return item;
        if (!item || typeof item !== "object") return "";
        const record = item as Record<string, unknown>;
        if (typeof record.id === "string") return record.id;
        if (typeof record.model === "string") return record.model;
        if (typeof record.name === "string") return record.name;
        return "";
      })
      .filter(Boolean)
  );
};

const buildCatalog = (
  models: string[],
  source: "aiproxy" | "env",
  warning?: string
): ChatModelCatalog => {
  const runtime = getAgentRuntimeConfig();
  const normalized = uniq(models);

  const defaultModel =
    normalized.find((item) => item === runtime.toolCallModel) ||
    runtime.toolCallModel ||
    normalized[0] ||
    "agent";

  return {
    models: normalized.map((model) => ({ id: model, label: model, source })),
    defaultModel,
    source,
    fetchedAt: new Date().toISOString(),
    warning,
  };
};

const fetchAiproxyModels = async (): Promise<ChatModelCatalog> => {
  const runtime = getAgentRuntimeConfig();
  const apiKey = runtime.apiKey;
  const baseUrl = runtime.baseUrl;

  if (!baseUrl || !apiKey) {
    const fallbackModels = getEnvCandidateModels();
    return buildCatalog(
      fallbackModels.length > 0 ? fallbackModels : ["agent"],
      "env",
      "missing_api_config"
    );
  }

  const endpoint = toModelsEndpoint(baseUrl);
  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const fallbackModels = getEnvCandidateModels();
    const warning = `models_fetch_failed:${response.status}`;
    return buildCatalog(
      fallbackModels.length > 0 ? fallbackModels : [runtime.toolCallModel],
      "env",
      warning
    );
  }

  const payload = await response.json();
  const models = toModelIds(payload);
  if (models.length === 0) {
    const fallbackModels = getEnvCandidateModels();
    return buildCatalog(
      fallbackModels.length > 0 ? fallbackModels : [runtime.toolCallModel],
      "env",
      "models_empty"
    );
  }

  return buildCatalog(models, "aiproxy");
};

export const getChatModelCatalog = async (forceRefresh = false): Promise<ChatModelCatalog> => {
  const now = Date.now();
  if (!forceRefresh && modelCatalogCache && modelCatalogCache.expiresAt > now) {
    return modelCatalogCache.value;
  }

  const value = await fetchAiproxyModels();
  modelCatalogCache = {
    value,
    expiresAt: now + CACHE_TTL_MS,
  };

  return value;
};

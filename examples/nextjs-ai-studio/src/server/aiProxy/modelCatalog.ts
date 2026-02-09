import { getAgentRuntimeConfig } from "@server/agent/runtimeConfig";

export interface ChatModelOption {
  id: string;
  label: string;
  source: "aiproxy" | "env";
}

export interface ChatModelCatalog {
  models: ChatModelOption[];
  defaultModel: string;
  toolCallModel: string;
  normalModel: string;
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
const uniqById = <T extends { id: string }>(items: T[]) => {
  const map = new Map<string, T>();
  for (const item of items) {
    if (!item?.id) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
};

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

interface ParsedModel {
  id: string;
  label: string;
  type?: string;
  usedInToolCall?: boolean;
  toolChoice?: boolean;
  functionCall?: boolean;
}

const getBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
};

const toParsedModels = (payload: unknown): ParsedModel[] => {
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

  const parsed = asArray
    .map((item): ParsedModel | null => {
      if (typeof item === "string") {
        const id = item.trim();
        return id ? { id, label: id } : null;
      }
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const idRaw = record.id ?? record.model ?? record.name;
      const id = typeof idRaw === "string" ? idRaw.trim() : "";
      if (!id) return null;
      const labelRaw =
        record.name ?? record.display_name ?? record.label ?? record.id ?? record.model;
      const label = typeof labelRaw === "string" && labelRaw.trim() ? labelRaw.trim() : id;

      const capabilities =
        record.capabilities && typeof record.capabilities === "object"
          ? (record.capabilities as Record<string, unknown>)
          : {};
      const metadata =
        record.metadata && typeof record.metadata === "object"
          ? (record.metadata as Record<string, unknown>)
          : {};

      const toolChoice =
        getBoolean(record.toolChoice) ??
        getBoolean(record.tool_choice) ??
        getBoolean(capabilities.toolChoice) ??
        getBoolean(capabilities.tool_choice) ??
        getBoolean(metadata.toolChoice) ??
        getBoolean(metadata.tool_choice);
      const functionCall =
        getBoolean(record.functionCall) ??
        getBoolean(record.function_call) ??
        getBoolean(capabilities.functionCall) ??
        getBoolean(capabilities.function_call) ??
        getBoolean(metadata.functionCall) ??
        getBoolean(metadata.function_call);
      const usedInToolCall =
        getBoolean(record.usedInToolCall) ??
        getBoolean(record.used_in_tool_call) ??
        getBoolean(capabilities.usedInToolCall) ??
        getBoolean(capabilities.used_in_tool_call) ??
        getBoolean(metadata.usedInToolCall) ??
        getBoolean(metadata.used_in_tool_call);

      return {
        id,
        label,
        type: typeof record.type === "string" ? record.type : undefined,
        usedInToolCall,
        toolChoice,
        functionCall,
      };
    })
    .filter((item): item is ParsedModel => Boolean(item));

  return uniqById(parsed);
};

const filterToolCallableLLMModels = ({
  models,
  runtimeToolCallModel,
  runtimeNormalModel,
}: {
  models: ParsedModel[];
  runtimeToolCallModel: string;
  runtimeNormalModel: string;
}) => {
  const keepByRuntime = new Set([runtimeToolCallModel, runtimeNormalModel].filter(Boolean));
  return models.filter((model) => {
    if (keepByRuntime.has(model.id)) return true;

    if (model.type && !["llm", "chat", "model"].includes(model.type.toLowerCase())) {
      return false;
    }

    if (model.usedInToolCall === true || model.toolChoice === true || model.functionCall === true) {
      return true;
    }
    return false;
  });
};

const buildCatalog = (
  models: Array<{ id: string; label: string }>,
  source: "aiproxy" | "env",
  warning?: string
): ChatModelCatalog => {
  const runtime = getAgentRuntimeConfig();
  const normalized =
    source === "aiproxy"
      ? uniqById(models)
      : uniqById(
          [
            { id: runtime.toolCallModel, label: runtime.toolCallModel },
            { id: runtime.normalModel, label: runtime.normalModel },
            ...models,
          ].filter((item) => item.id)
        );

  const normalizedIds = normalized.map((item) => item.id);

  const defaultModel =
    normalizedIds.find((item) => item === runtime.toolCallModel) ||
    normalizedIds.find((item) => item === runtime.normalModel) ||
    normalizedIds[0] ||
    "agent";

  const unavailableRuntimeModels =
    source === "aiproxy"
      ? [runtime.toolCallModel, runtime.normalModel].filter(
          (modelId) => modelId && !normalizedIds.includes(modelId)
        )
      : [];
  const mergedWarning =
    unavailableRuntimeModels.length > 0
      ? [warning, `runtime_model_unavailable:${unavailableRuntimeModels.join(",")}`]
          .filter(Boolean)
          .join(";")
      : warning;

  return {
    models: normalized.map((model) => ({ id: model.id, label: model.label, source })),
    defaultModel,
    toolCallModel: runtime.toolCallModel,
    normalModel: runtime.normalModel,
    source,
    fetchedAt: new Date().toISOString(),
    warning: mergedWarning,
  };
};

const fetchAiproxyModels = async (): Promise<ChatModelCatalog> => {
  const runtime = getAgentRuntimeConfig();
  const apiKey = runtime.apiKey;
  const baseUrl = runtime.baseUrl;

  if (!baseUrl || !apiKey) {
    const fallbackModels = uniq([runtime.toolCallModel, runtime.normalModel].filter(Boolean)).map(
      (id) => ({ id, label: id })
    );
    return buildCatalog(
      fallbackModels.length > 0 ? fallbackModels : [{ id: "agent", label: "agent" }],
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
    const fallbackModels = uniq([runtime.toolCallModel, runtime.normalModel].filter(Boolean)).map(
      (id) => ({ id, label: id })
    );
    const warning = `models_fetch_failed:${response.status}`;
    return buildCatalog(
      fallbackModels.length > 0
        ? fallbackModels
        : [{ id: runtime.toolCallModel, label: runtime.toolCallModel }],
      "env",
      warning
    );
  }

  const payload = await response.json();
  const parsedModels = toParsedModels(payload);
  const models = filterToolCallableLLMModels({
    models: parsedModels,
    runtimeToolCallModel: runtime.toolCallModel,
    runtimeNormalModel: runtime.normalModel,
  }).map((item) => ({ id: item.id, label: item.label }));
  if (models.length === 0) {
    const fallbackModels = uniq([runtime.toolCallModel, runtime.normalModel].filter(Boolean)).map(
      (id) => ({ id, label: id })
    );
    return buildCatalog(
      fallbackModels.length > 0
        ? fallbackModels
        : [{ id: runtime.toolCallModel, label: runtime.toolCallModel }],
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

// warm up model catalog at startup so frontend can load model list immediately
void getChatModelCatalog().catch(() => undefined);

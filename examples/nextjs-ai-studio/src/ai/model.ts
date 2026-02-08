import { getAgentRuntimeConfig } from '@aistudio/server/agent/runtimeConfig';

import type { LLMModelItemType } from './compat/global/core/ai/model.d';

const DEFAULT_MAX_RESPONSE = 8192;
const DEFAULT_QUOTE_MAX_TOKEN = 2000;

const resolveModelId = (input: string | LLMModelItemType | undefined, fallback: string): string => {
  if (typeof input === 'string' && input.trim()) return input.trim();
  if (input && typeof input === 'object' && typeof input.model === 'string' && input.model.trim()) {
    return input.model.trim();
  }
  return fallback;
};

export const getLLMModel = (input: string | LLMModelItemType): LLMModelItemType => {
  const config = getAgentRuntimeConfig();
  const model = resolveModelId(input, config.toolCallModel);
  const maxContext = config.maxContext ?? 16000;
  return {
    provider: config.provider,
    model,
    name: model,
    type: 'llm',
    maxContext,
    maxResponse: DEFAULT_MAX_RESPONSE,
    quoteMaxToken: DEFAULT_QUOTE_MAX_TOKEN,
    functionCall: true,
    toolChoice: true
  } as LLMModelItemType;
};

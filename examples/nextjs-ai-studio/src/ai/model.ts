import type { LLMModelItemType } from './compat/global/core/ai/model.d';
import { getAgentRuntimeConfig } from '@aistudio/server/agent/runtimeConfig';

const DEFAULT_MAX_RESPONSE = 8192;
const DEFAULT_QUOTE_MAX_TOKEN = 2000;

export const getLLMModel = (_model: string): LLMModelItemType => {
  const config = getAgentRuntimeConfig();
  const model = config.toolCallModel;
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

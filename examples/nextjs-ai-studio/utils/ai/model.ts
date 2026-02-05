import type { LLMModelItemType } from './compat/global/core/ai/model.d';
import { getAgentRuntimeConfig } from '../agentConfig';

export const getLLMModel = (_model: string): LLMModelItemType => {
  const config = getAgentRuntimeConfig();
  return {
    model: config.toolCallModel,
    maxContext: config.maxContext || 16000,
    toolChoice: true
  };
};

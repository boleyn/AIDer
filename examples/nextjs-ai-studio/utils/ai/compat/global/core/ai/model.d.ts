export type LLMModelItemType = {
  model: string;
  maxContext: number;
  toolChoice?: boolean;
  requestUrl?: string;
  requestAuth?: string;
};

export type AgentRuntimeConfig = {
  provider: "google" | "openai" | string;
  modelName: string;
  temperature: number;
  recursionLimit?: number;
  openaiKey?: string;
  openaiBaseUrl?: string;
  googleKey?: string;
  googleBaseUrl?: string;
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

export const getAgentRuntimeConfig = (): AgentRuntimeConfig => {
  const provider =
    (process.env.AI_PROVIDER || (process.env.GOOGLE_API_KEY ? "google" : "openai"))
      .toLowerCase();

  const modelName =
    process.env.AI_MODEL ||
    (provider === "google" ? process.env.GOOGLE_MODEL : process.env.OPENAI_MODEL) ||
    DEFAULT_MODEL;

  return {
    provider,
    modelName,
    temperature: Number.parseFloat(process.env.AI_TEMPERATURE || "0.2"),
    recursionLimit: process.env.AI_RECURSION_LIMIT
      ? Number.parseInt(process.env.AI_RECURSION_LIMIT, 50)
      : undefined,
    openaiKey: process.env.OPENAI_API_KEY,
    openaiBaseUrl: process.env.OPENAI_BASE_URL,
    googleKey: process.env.GOOGLE_API_KEY,
    googleBaseUrl: process.env.GOOGLE_BASE_URL,
  };
};

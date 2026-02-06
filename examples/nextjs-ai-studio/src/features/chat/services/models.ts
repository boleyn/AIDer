import { withAuthHeaders } from "@features/auth/client/authClient";

export interface ChatModelCatalog {
  models: Array<{
    id: string;
    label: string;
    source: "aiproxy" | "env";
  }>;
  defaultModel: string;
  source: "aiproxy" | "env";
  fetchedAt: string;
  warning?: string;
}

export const getChatModels = async (): Promise<ChatModelCatalog> => {
  const response = await fetch("/api/chat/models", {
    cache: "no-store",
    headers: withAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`模型列表获取失败: ${response.status}`);
  }

  return response.json();
};

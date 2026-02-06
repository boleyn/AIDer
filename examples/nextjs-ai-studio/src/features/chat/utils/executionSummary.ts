import type { ConversationMessage } from "@/types/conversation";

export interface MessageExecutionSummary {
  nodeCount: number;
  durationSeconds?: number;
}

export const getExecutionSummary = (
  message: ConversationMessage
): MessageExecutionSummary | null => {
  if (message.role !== "assistant") return null;
  const meta = message.additional_kwargs;
  if (!meta || typeof meta !== "object") return null;

  const responseData = Array.isArray((meta as { responseData?: unknown }).responseData)
    ? ((meta as { responseData?: unknown[] }).responseData ?? [])
    : [];
  const durationSeconds =
    typeof (meta as { durationSeconds?: unknown }).durationSeconds === "number"
      ? ((meta as { durationSeconds?: number }).durationSeconds ?? 0)
      : undefined;

  if (responseData.length === 0 && durationSeconds === undefined) return null;

  return {
    nodeCount: responseData.length,
    durationSeconds,
  };
};


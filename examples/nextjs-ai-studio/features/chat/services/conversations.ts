import type { Conversation, ConversationMessage, ConversationSummary } from "../../../types/conversation";
import { withAuthHeaders } from "../../../utils/auth/client";

export async function listConversations(token: string): Promise<ConversationSummary[]> {
  const response = await fetch(`/api/conversations?token=${encodeURIComponent(token)}`, {
    cache: "no-store",
    headers: withAuthHeaders(),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { conversations?: ConversationSummary[] };
  return payload.conversations ?? [];
}

export async function createConversation(
  token: string,
  messages: ConversationMessage[]
): Promise<Conversation | null> {
  const response = await fetch(`/api/conversations?token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...withAuthHeaders() },
    body: JSON.stringify({ token, messages }),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { conversation?: Conversation };
  return payload.conversation ?? null;
}

export async function deleteAllConversations(token: string): Promise<number> {
  const response = await fetch(`/api/conversations?token=${encodeURIComponent(token)}`, {
    method: "DELETE",
    headers: withAuthHeaders(),
  });
  if (!response.ok) return 0;
  const payload = (await response.json()) as { deletedCount?: number };
  return payload.deletedCount ?? 0;
}

export async function getConversation(
  token: string,
  id: string
): Promise<Conversation | null> {
  const response = await fetch(
    `/api/conversations/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
    { cache: "no-store", headers: withAuthHeaders() }
  );
  if (!response.ok) return null;
  const payload = (await response.json()) as { conversation?: Conversation };
  return payload.conversation ?? null;
}

export async function deleteConversation(token: string, id: string): Promise<boolean> {
  const response = await fetch(
    `/api/conversations/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`,
    { method: "DELETE", headers: withAuthHeaders() }
  );
  return response.ok;
}

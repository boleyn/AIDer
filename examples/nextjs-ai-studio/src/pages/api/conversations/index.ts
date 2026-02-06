import type { NextApiRequest, NextApiResponse } from "next";
import {
  createConversation,
  deleteAllConversations,
  listConversations,
  type Conversation,
  type ConversationMessage,
  type ConversationSummary,
} from "@server/conversations/conversationStorage";
import { requireAuth } from "@server/auth/session";

type ConversationListResponse = {
  conversations: ConversationSummary[];
};

type ConversationCreateResponse = {
  conversation: Conversation;
};

type ConversationDeleteAllResponse = {
  deletedCount: number;
};

const getToken = (req: NextApiRequest): string | null => {
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : null;
  return queryToken ?? bodyToken;
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<
    ConversationListResponse | ConversationCreateResponse | ConversationDeleteAllResponse | { error: string }
  >
) => {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  const token = getToken(req);
  if (!token) {
    res.status(400).json({ error: "缺少 token 参数" });
    return;
  }

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const conversations = await listConversations(token);
    res.status(200).json({ conversations });
    return;
  }

  if (req.method === "POST") {
    res.setHeader("Cache-Control", "no-store");
    const title = typeof req.body?.title === "string" ? req.body.title : undefined;
    const messages = Array.isArray(req.body?.messages)
      ? (req.body.messages as ConversationMessage[])
      : undefined;
    const conversation = await createConversation(token, { title, messages });
    res.status(200).json({ conversation });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Cache-Control", "no-store");
    const deletedCount = await deleteAllConversations(token);
    res.status(200).json({ deletedCount });
    return;
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  res.status(405).json({ error: `方法 ${req.method} 不被允许` });
};

export default handler;

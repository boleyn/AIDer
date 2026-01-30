import type { NextApiRequest, NextApiResponse } from "next";
import {
  deleteConversation,
  getConversation,
  replaceConversationMessages,
  type Conversation,
  type ConversationMessage,
} from "../../../utils/conversationStorage";

type ConversationResponse = {
  conversation: Conversation | null;
};

const getToken = (req: NextApiRequest): string | null => {
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : null;
  return queryToken ?? bodyToken;
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse<ConversationResponse | { error: string }>
) => {
  const token = getToken(req);
  if (!token) {
    res.status(400).json({ error: "缺少 token 参数" });
    return;
  }

  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) {
    res.status(400).json({ error: "缺少对话 ID" });
    return;
  }

  if (req.method === "GET") {
    res.setHeader("Cache-Control", "no-store");
    const conversation = await getConversation(token, id);
    if (!conversation) {
      res.status(404).json({ error: "对话不存在" });
      return;
    }
    res.status(200).json({ conversation });
    return;
  }

  if (req.method === "PATCH") {
    res.setHeader("Cache-Control", "no-store");
    const messages = Array.isArray(req.body?.messages)
      ? (req.body.messages as ConversationMessage[])
      : [];
    const title = typeof req.body?.title === "string" ? req.body.title : undefined;
    await replaceConversationMessages(token, id, messages, title);
    const conversation = await getConversation(token, id);
    if (!conversation) {
      res.status(404).json({ error: "对话不存在" });
      return;
    }
    res.status(200).json({ conversation });
    return;
  }

  if (req.method === "DELETE") {
    res.setHeader("Cache-Control", "no-store");
    const deleted = await deleteConversation(token, id);
    if (!deleted) {
      res.status(404).json({ error: "对话不存在" });
      return;
    }
    res.status(200).json({ conversation: null as unknown as Conversation });
    return;
  }

  res.setHeader("Allow", ["GET", "PATCH", "DELETE"]);
  res.status(405).json({ error: `方法 ${req.method} 不被允许` });
};

export default handler;

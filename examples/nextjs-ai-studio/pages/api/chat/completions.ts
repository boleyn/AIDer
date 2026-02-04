import type { NextApiRequest, NextApiResponse } from "next";
import { extractText } from "../../../utils/agent/messageSerialization";
import type { IncomingMessage } from "../../../utils/agent/messageSerialization";
import { getAuthTokenFromRequest, requireAuth } from "../../../utils/auth/session";

const getToken = (req: NextApiRequest): string | null => {
  const headerToken =
    typeof req.headers["x-project-token"] === "string"
      ? req.headers["x-project-token"]
      : null;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const bodyToken = typeof req.body?.token === "string" ? req.body.token : null;
  return headerToken ?? bodyToken ?? queryToken;
};

const buildAgentUrl = (req: NextApiRequest, stream: boolean) => {
  const protocol =
    typeof req.headers["x-forwarded-proto"] === "string"
      ? req.headers["x-forwarded-proto"]
      : "http";
  const host = req.headers.host;
  return `${protocol}://${host}/api/agent?stream=${stream ? "1" : "0"}`;
};

const sendSse = (res: NextApiResponse, data: string) => {
  res.write(`data: ${data}\n\n`);
};

const startSse = (res: NextApiResponse) => {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
};

const toIncomingMessages = (messages: unknown): IncomingMessage[] => {
  if (!Array.isArray(messages)) return [];
  return messages
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const record = message as {
        role?: string;
        content?: unknown;
        name?: string;
        tool_call_id?: string;
      };
      if (!record.role) return null;
      const role = record.role;
      if (role !== "user" && role !== "assistant" && role !== "system" && role !== "tool") {
        return null;
      }
      return {
        role,
        content: record.content ?? "",
        name: record.name,
        tool_call_id: record.tool_call_id,
      } as IncomingMessage;
    })
    .filter((message): message is IncomingMessage => Boolean(message));
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `方法 ${req.method} 不被允许` });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;
  const authToken = getAuthTokenFromRequest(req);

  const token = getToken(req);
  if (!token) {
    res.status(400).json({ error: "缺少 token 参数" });
    return;
  }

  const incomingMessages = toIncomingMessages(req.body?.messages);
  if (incomingMessages.length === 0) {
    res.status(400).json({ error: "缺少 messages" });
    return;
  }

  const stream = req.body?.stream === true;
  const conversationId =
    typeof req.body?.conversation_id === "string"
      ? req.body.conversation_id
      : typeof req.body?.conversationId === "string"
      ? req.body.conversationId
      : undefined;
  const model = typeof req.body?.model === "string" ? req.body.model : "agent";

  if (!stream) {
    const agentResponse = await fetch(buildAgentUrl(req, false), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        token,
        messages: incomingMessages,
        stream: false,
        conversationId,
      }),
    });

    const payload = (await agentResponse.json().catch(() => null)) as
      | { message?: string; error?: string }
      | null;

    if (!agentResponse.ok) {
      res.status(agentResponse.status).json({ error: payload?.error || "请求失败" });
      return;
    }

    const message = payload?.message ?? "";
    const created = Math.floor(Date.now() / 1000);
    res.status(200).json({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion",
      created,
      model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: message,
          },
          finish_reason: "stop",
        },
      ],
    });
    return;
  }

  startSse(res);

  const agentResponse = await fetch(buildAgentUrl(req, true), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      token,
      messages: incomingMessages,
      stream: true,
      conversationId,
    }),
  });

  if (!agentResponse.ok || !agentResponse.body) {
    sendSse(res, JSON.stringify({ error: "请求失败" }));
    sendSse(res, "[DONE]");
    res.end();
    return;
  }

  const reader = agentResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const created = Math.floor(Date.now() / 1000);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n");
      let eventName = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventName = line.replace("event:", "").trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.replace("data:", "").trim());
        }
      }

      const dataLine = dataLines.join("\n");
      if (!dataLine) continue;

      let payload: unknown;
      try {
        payload = JSON.parse(dataLine);
      } catch {
        continue;
      }

      if (
        eventName !== "messages" &&
        eventName !== "messages/partial" &&
        eventName !== "messages/complete"
      ) {
        continue;
      }

      let content = "";
      if (Array.isArray(payload)) {
        const chunk = payload[0] as { content?: unknown } | undefined;
        content = extractText(chunk?.content ?? "");
      } else if (payload && typeof payload === "object") {
        const record = payload as { content?: unknown };
        content = extractText(record.content ?? "");
      }

      if (!content) continue;

      const chunk = {
        id: `chatcmpl-${Date.now()}`,
        object: "chat.completion.chunk",
        created,
        model,
        choices: [
          {
            index: 0,
            delta: { content },
            finish_reason: null,
          },
        ],
      };
      sendSse(res, JSON.stringify(chunk));
    }
  }

  sendSse(
    res,
    JSON.stringify({
      id: `chatcmpl-${Date.now()}`,
      object: "chat.completion.chunk",
      created,
      model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: "stop",
        },
      ],
    })
  );
  sendSse(res, "[DONE]");
  res.end();
}

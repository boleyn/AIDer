import { ObjectId } from "mongodb";

import { createId, extractText } from "@shared/chat/messages";
import type { ToolCall } from "../../types/conversation";

import { getMongoDb } from "../db/mongo";

export type ConversationMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  id?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  additional_kwargs?: Record<string, unknown>;
  status?: "success" | "error";
  artifact?: unknown;
};

export type ConversationSummary = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type Conversation = ConversationSummary & {
  messages: ConversationMessage[];
};

type ConversationMetaDoc = {
  _id: ObjectId;
  token: string;
  chatId?: string;
  title?: string;
  customTitle?: string;
  top?: boolean;
  createTime?: Date;
  updateTime?: Date;
  deleteTime?: Date | null;

  // Legacy fields
  createdAt?: string;
  updatedAt?: string;
  messages?: ConversationMessage[];
};

type ConversationItemDoc = {
  _id: ObjectId;
  token: string;
  chatId: string;
  dataId: string;
  time: Date;
  role: ConversationMessage["role"];
  content: unknown;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  additional_kwargs?: Record<string, unknown>;
  status?: "success" | "error";
  artifact?: unknown;
};

const META_COLLECTION = "conversations";
const ITEM_COLLECTION = "conversation_items";
const MAX_LIST_CONVERSATIONS = 200;
const MAX_RECORD_PAGE_SIZE = 2000;

const migratedTokens = new Set<string>();

const getMetaCollection = async () => {
  const db = await getMongoDb();
  const col = db.collection<ConversationMetaDoc>(META_COLLECTION);
  await Promise.all([
    col.createIndex({ token: 1, chatId: 1 }, { unique: true, sparse: true }),
    col.createIndex({ token: 1, deleteTime: 1, top: -1, updateTime: -1 }),
  ]);
  return col;
};

const getItemCollection = async () => {
  const db = await getMongoDb();
  const col = db.collection<ConversationItemDoc>(ITEM_COLLECTION);
  await Promise.all([
    col.createIndex({ token: 1, chatId: 1, time: 1 }),
    col.createIndex({ token: 1, chatId: 1, dataId: 1 }),
  ]);
  return col;
};

const getChatId = () => new ObjectId().toHexString();

const toDate = (value: unknown, fallback: Date) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
};

const messageToDoc = ({
  token,
  chatId,
  message,
  time,
}: {
  token: string;
  chatId: string;
  message: ConversationMessage;
  time: Date;
}): ConversationItemDoc => ({
  _id: new ObjectId(),
  token,
  chatId,
  dataId: message.id || createId(),
  time,
  role: message.role,
  content: message.content,
  name: message.name,
  tool_call_id: message.tool_call_id,
  tool_calls: message.tool_calls,
  additional_kwargs: message.additional_kwargs,
  status: message.status,
  artifact: message.artifact,
});

const docToMessage = (doc: ConversationItemDoc): ConversationMessage => ({
  role: doc.role,
  content: doc.content,
  id: doc.dataId,
  name: doc.name,
  tool_call_id: doc.tool_call_id,
  tool_calls: doc.tool_calls,
  additional_kwargs: doc.additional_kwargs,
  status: doc.status,
  artifact: doc.artifact,
});

const summaryTitle = (doc: ConversationMetaDoc) =>
  (doc.customTitle || doc.title || "历史记录").trim() || "历史记录";

const deriveTitleFromMessage = (content: unknown): string | null => {
  const text = extractText(content).trim();
  if (!text) return null;
  return text.length > 40 ? `${text.slice(0, 40)}...` : text;
};

const toSummary = (doc: ConversationMetaDoc): ConversationSummary => {
  const now = new Date();
  const created = toDate(doc.createTime ?? doc.createdAt, now);
  const updated = toDate(doc.updateTime ?? doc.updatedAt, created);

  return {
    id: doc.chatId || doc._id.toHexString(),
    title: summaryTitle(doc),
    createdAt: created.toISOString(),
    updatedAt: updated.toISOString(),
  };
};

const migrateLegacyTokenConversations = async (token: string) => {
  if (migratedTokens.has(token)) return;

  const metaCol = await getMetaCollection();
  const itemCol = await getItemCollection();

  const legacyDocs = await metaCol
    .find({ token, chatId: { $exists: false } })
    .limit(200)
    .toArray();

  if (legacyDocs.length === 0) {
    migratedTokens.add(token);
    return;
  }

  for (const doc of legacyDocs) {
    const chatId = doc._id.toHexString();
    const createTime = toDate(doc.createTime ?? doc.createdAt, new Date());
    const updateTime = toDate(doc.updateTime ?? doc.updatedAt, createTime);

    const existingCount = await itemCol.countDocuments({ token, chatId }, { limit: 1 });
    if (existingCount === 0 && Array.isArray(doc.messages) && doc.messages.length > 0) {
      const itemDocs = doc.messages.map((message, index) =>
        messageToDoc({
          token,
          chatId,
          message,
          time: new Date(createTime.getTime() + index),
        })
      );
      await itemCol.insertMany(itemDocs, { ordered: true });
    }

    await metaCol.updateOne(
      { _id: doc._id },
      {
        $set: {
          chatId,
          createTime,
          updateTime,
          deleteTime: doc.deleteTime ?? null,
          top: doc.top ?? false,
          customTitle: doc.customTitle ?? "",
        },
      }
    );
  }

  migratedTokens.add(token);
};

const getMetaByChatId = async (
  token: string,
  chatId: string,
  opts?: { includeDeleted?: boolean }
) => {
  await migrateLegacyTokenConversations(token);
  const col = await getMetaCollection();

  const found = await col.findOne({
    token,
    chatId,
    ...(opts?.includeDeleted ? {} : { deleteTime: null }),
  });
  if (found) return found;

  // backward compatibility: allow legacy ObjectId route values
  try {
    const objectId = new ObjectId(chatId);
    const legacy = await col.findOne({ _id: objectId, token });
    if (!legacy) return null;

    const normalizedChatId = legacy.chatId || legacy._id.toHexString();
    if (!legacy.chatId) {
      await col.updateOne(
        { _id: legacy._id },
        {
          $set: {
            chatId: normalizedChatId,
            createTime: toDate(legacy.createTime ?? legacy.createdAt, new Date()),
            updateTime: toDate(legacy.updateTime ?? legacy.updatedAt, new Date()),
            deleteTime: legacy.deleteTime ?? null,
            top: legacy.top ?? false,
            customTitle: legacy.customTitle ?? "",
          },
        }
      );
    }

    return col.findOne({
      token,
      chatId: normalizedChatId,
      ...(opts?.includeDeleted ? {} : { deleteTime: null }),
    });
  } catch {
    return null;
  }
};

const getConversationMessages = async (token: string, chatId: string) => {
  const itemCol = await getItemCollection();
  const itemDocs = await itemCol.find({ token, chatId }).sort({ time: 1, _id: 1 }).toArray();
  if (itemDocs.length > 0) {
    return itemDocs.map(docToMessage);
  }

  // emergency fallback for data before migration inserts item docs
  const metaCol = await getMetaCollection();
  const legacy = await metaCol.findOne({ token, chatId });
  return Array.isArray(legacy?.messages) ? legacy.messages : [];
};

const ensureMetaByChatId = async ({
  token,
  chatId,
  title,
}: {
  token: string;
  chatId: string;
  title?: string;
}) => {
  const metaCol = await getMetaCollection();
  const now = new Date();
  const hasTitle = typeof title === "string";
  const nextTitle = hasTitle ? title.trim() || "历史记录" : "历史记录";
  await metaCol.updateOne(
    { token, chatId },
    {
      $set: {
        updateTime: now,
        deleteTime: null,
        ...(hasTitle ? { title: nextTitle } : {}),
      },
      $setOnInsert: {
        _id: new ObjectId(),
        token,
        chatId,
        ...(!hasTitle ? { title: nextTitle } : {}),
        customTitle: "",
        top: false,
        createTime: now,
      },
    },
    { upsert: true }
  );
};

export async function listConversations(token: string): Promise<ConversationSummary[]> {
  await migrateLegacyTokenConversations(token);
  const metaCol = await getMetaCollection();
  const docs = await metaCol
    .find({ token, chatId: { $exists: true }, deleteTime: null })
    .sort({ top: -1, updateTime: -1 })
    .limit(MAX_LIST_CONVERSATIONS)
    .toArray();
  const summaries = docs.map(toSummary);
  const itemCol = await getItemCollection();

  await Promise.all(
    docs.map(async (doc, index) => {
      const summary = summaries[index];
      const chatId = doc.chatId;
      if (!chatId || summary.title !== "历史记录") return;

      const latestUser = await itemCol.findOne(
        { token, chatId, role: "user" },
        { sort: { time: -1, _id: -1 } }
      );
      const derivedTitle = deriveTitleFromMessage(latestUser?.content);
      if (!derivedTitle) return;

      summaries[index] = {
        ...summary,
        title: derivedTitle,
      };

      await metaCol.updateOne(
        { token, chatId },
        {
          $set: {
            title: derivedTitle,
            updateTime: new Date(),
          },
        }
      );
    })
  );

  return summaries;
}

export async function getConversation(token: string, id: string): Promise<Conversation | null> {
  const meta = await getMetaByChatId(token, id);
  if (!meta || !meta.chatId) return null;

  const messages = await getConversationMessages(token, meta.chatId);
  return {
    ...toSummary(meta),
    messages,
  };
}

export async function createConversation(
  token: string,
  input: { title?: string; messages?: ConversationMessage[]; chatId?: string } = {}
): Promise<Conversation> {
  await migrateLegacyTokenConversations(token);

  const itemCol = await getItemCollection();

  const now = new Date();
  const chatId = input.chatId || getChatId();
  const title = input.title?.trim() || "历史记录";

  await ensureMetaByChatId({ token, chatId, title });

  const sourceMessages = Array.isArray(input.messages) ? input.messages : [];
  if (sourceMessages.length > 0) {
    await itemCol.insertMany(
      sourceMessages.map((message, index) =>
        messageToDoc({ token, chatId, message, time: new Date(now.getTime() + index) })
      )
    );
  }

  return {
    id: chatId,
    title,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    messages: sourceMessages.map((message) => ({
      ...message,
      id: message.id || createId(),
    })),
  };
}

export async function appendConversationMessages(
  token: string,
  id: string,
  messages: ConversationMessage[],
  title?: string
): Promise<void> {
  if (messages.length === 0) return;

  const itemCol = await getItemCollection();
  await ensureMetaByChatId({ token, chatId: id, title });
  const now = new Date();

  await itemCol.insertMany(
    messages.map((message, index) =>
      messageToDoc({
        token,
        chatId: id,
        message,
        time: new Date(now.getTime() + index),
      })
    )
  );
}

export async function replaceConversationMessages(
  token: string,
  id: string,
  messages: ConversationMessage[],
  title?: string
): Promise<void> {
  const chatId = id;
  const itemCol = await getItemCollection();
  await ensureMetaByChatId({ token, chatId, title });
  const now = new Date();

  await itemCol.deleteMany({ token, chatId });

  if (messages.length > 0) {
    await itemCol.insertMany(
      messages.map((message, index) =>
        messageToDoc({
          token,
          chatId,
          message,
          time: new Date(now.getTime() + index),
        })
      )
    );
  }

  await ensureMetaByChatId({ token, chatId, title });
}

export async function updateConversation(
  token: string,
  id: string,
  data: { title?: string; customTitle?: string; top?: boolean }
): Promise<void> {
  await ensureMetaByChatId({ token, chatId: id, title: data.title });

  const update: Record<string, unknown> = {
    updateTime: new Date(),
  };
  if (typeof data.title === "string") {
    update.title = data.title.trim() || "历史记录";
  }
  if (typeof data.customTitle === "string") {
    update.customTitle = data.customTitle.trim();
  }
  if (typeof data.top === "boolean") {
    update.top = data.top;
  }

  const metaCol = await getMetaCollection();
  await metaCol.updateOne(
    { token, chatId: id },
    {
      $set: update,
    }
  );
}

export async function getConversationRecords({
  token,
  chatId,
  offset = 0,
  pageSize = 50,
  includeDeleted = false,
}: {
  token: string;
  chatId: string;
  offset?: number;
  pageSize?: number;
  includeDeleted?: boolean;
}): Promise<{ list: ConversationMessage[]; total: number }> {
  const meta = await getMetaByChatId(token, chatId, { includeDeleted });
  if (!meta?.chatId) {
    return { list: [], total: 0 };
  }

  const itemCol = await getItemCollection();
  const [docs, total] = await Promise.all([
    itemCol
      .find({ token, chatId })
      .sort({ time: -1, _id: -1 })
      .skip(Math.max(0, offset))
      .limit(Math.max(1, Math.min(MAX_RECORD_PAGE_SIZE, pageSize)))
      .toArray(),
    itemCol.countDocuments({ token, chatId }),
  ]);

  return {
    list: docs.reverse().map(docToMessage),
    total,
  };
}

export async function getConversationRecordsV2({
  token,
  chatId,
  pageSize = 50,
  initialId,
  prevId,
  nextId,
  includeDeleted = false,
}: {
  token: string;
  chatId: string;
  pageSize?: number;
  initialId?: string;
  prevId?: string;
  nextId?: string;
  includeDeleted?: boolean;
}): Promise<{
  list: ConversationMessage[];
  total: number;
  hasMorePrev: boolean;
  hasMoreNext: boolean;
}> {
  const meta = await getMetaByChatId(token, chatId, { includeDeleted });
  if (!meta?.chatId) {
    return { list: [], total: 0, hasMorePrev: false, hasMoreNext: false };
  }

  const itemCol = await getItemCollection();
  const docs = await itemCol.find({ token, chatId }).sort({ time: 1, _id: 1 }).toArray();
  const total = docs.length;
  const size = Math.max(1, Math.min(MAX_RECORD_PAGE_SIZE, pageSize));

  if (total === 0) {
    return { list: [], total: 0, hasMorePrev: false, hasMoreNext: false };
  }

  const findIndex = (id?: string) => (id ? docs.findIndex((item) => item.dataId === id) : -1);

  let selected: ConversationItemDoc[] = [];
  let hasMorePrev = false;
  let hasMoreNext = false;

  if (prevId) {
    const index = findIndex(prevId);
    if (index <= 0) {
      return { list: [], total, hasMorePrev: false, hasMoreNext: true };
    }
    const start = Math.max(0, index - size);
    selected = docs.slice(start, index);
    hasMorePrev = start > 0;
    hasMoreNext = true;
  } else if (nextId) {
    const index = findIndex(nextId);
    if (index === -1 || index >= total - 1) {
      return { list: [], total, hasMorePrev: true, hasMoreNext: false };
    }
    const start = index + 1;
    const end = Math.min(total, start + size);
    selected = docs.slice(start, end);
    hasMorePrev = true;
    hasMoreNext = end < total;
  } else if (initialId) {
    const index = findIndex(initialId);
    if (index === -1) {
      return { list: [], total, hasMorePrev: false, hasMoreNext: false };
    }
    const half = Math.floor(size / 2);
    const start = Math.max(0, index - half);
    const end = Math.min(total, start + size);
    selected = docs.slice(start, end);
    hasMorePrev = start > 0;
    hasMoreNext = end < total;
  } else {
    const start = Math.max(0, total - size);
    selected = docs.slice(start, total);
    hasMorePrev = start > 0;
    hasMoreNext = false;
  }

  return {
    list: selected.map(docToMessage),
    total,
    hasMorePrev,
    hasMoreNext,
  };
}

export async function deleteConversation(token: string, id: string): Promise<boolean> {
  const meta = await getMetaByChatId(token, id);
  if (!meta?.chatId) return false;

  const col = await getMetaCollection();
  const result = await col.updateOne(
    { token, chatId: meta.chatId, deleteTime: null },
    {
      $set: {
        deleteTime: new Date(),
        updateTime: new Date(),
      },
    }
  );

  return (result.modifiedCount ?? 0) > 0;
}

export async function deleteAllConversations(token: string): Promise<number> {
  await migrateLegacyTokenConversations(token);

  const col = await getMetaCollection();
  const now = new Date();
  const result = await col.updateMany(
    { token, chatId: { $exists: true }, deleteTime: null },
    {
      $set: {
        deleteTime: now,
        updateTime: now,
      },
    }
  );

  return result.modifiedCount ?? 0;
}

import { ObjectId } from "mongodb";
import type { ToolCall, ToolCallChunk } from "@langchain/core/messages";
import { getMongoDb } from "./mongo";

export type ConversationMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: unknown;
  id?: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  tool_call_chunks?: ToolCallChunk[];
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

type ConversationDoc = {
  _id: ObjectId;
  token: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ConversationMessage[];
};

const COLLECTION = "conversations";

const toSummary = (doc: ConversationDoc): ConversationSummary => ({
  id: doc._id.toHexString(),
  title: doc.title,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const toConversation = (doc: ConversationDoc): Conversation => ({
  ...toSummary(doc),
  messages: doc.messages,
});

const getCollection = async () => {
  const db = await getMongoDb();
  return db.collection<ConversationDoc>(COLLECTION);
};

const toObjectId = (id: string): ObjectId | null => {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
};

export async function listConversations(token: string): Promise<ConversationSummary[]> {
  const collection = await getCollection();
  const docs = await collection
    .find({ token })
    .sort({ updatedAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(toSummary);
}

export async function getConversation(
  token: string,
  id: string
): Promise<Conversation | null> {
  const objectId = toObjectId(id);
  if (!objectId) return null;
  const collection = await getCollection();
  const doc = await collection.findOne({ _id: objectId, token });
  return doc ? toConversation(doc) : null;
}

export async function createConversation(
  token: string,
  input: { title?: string; messages?: ConversationMessage[] } = {}
): Promise<Conversation> {
  const collection = await getCollection();
  const now = new Date().toISOString();
  const doc: Omit<ConversationDoc, "_id"> = {
    token,
    title: input.title?.trim() || "新对话",
    createdAt: now,
    updatedAt: now,
    messages: input.messages ?? [],
  };
  const result = await collection.insertOne(doc);
  return {
    id: result.insertedId.toHexString(),
    title: doc.title,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    messages: doc.messages,
  };
}

export async function appendConversationMessages(
  token: string,
  id: string,
  messages: ConversationMessage[]
): Promise<void> {
  if (messages.length === 0) return;
  const objectId = toObjectId(id);
  if (!objectId) return;
  const collection = await getCollection();
  const now = new Date().toISOString();
  await collection.updateOne(
    { _id: objectId, token },
    {
      $push: { messages: { $each: messages } },
      $set: { updatedAt: now },
    }
  );
}

export async function replaceConversationMessages(
  token: string,
  id: string,
  messages: ConversationMessage[],
  title?: string
): Promise<void> {
  const objectId = toObjectId(id);
  if (!objectId) return;
  const collection = await getCollection();
  const now = new Date().toISOString();
  const update: Record<string, unknown> = {
    messages,
    updatedAt: now,
  };
  if (title) {
    update.title = title;
  }
  await collection.updateOne(
    { _id: objectId, token },
    {
      $set: update,
    }
  );
}

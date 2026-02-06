import { ObjectId } from "mongodb";
import { randomBytes } from "crypto";
import { getMongoDb } from "../db/mongo";

export type ProjectFile = {
  code: string;
};

export type ProjectMeta = {
  token: string;
  name: string;
  template: string;
  userId: string;
  dependencies?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ProjectData = {
  token: string;
  name: string;
  template: string;
  userId: string;
  files: Record<string, ProjectFile>;
  dependencies?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ProjectListItem = {
  token: string;
  name: string;
  updatedAt: string;
};

type ProjectDoc = {
  _id: ObjectId;
  token: string;
  name: string;
  template: string;
  userId: string;
  files: Record<string, ProjectFile>;
  dependencies?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

const COLLECTION = "projects";

async function getCollection() {
  const db = await getMongoDb();
  return db.collection<ProjectDoc>(COLLECTION);
}

async function ensureTokenIndex() {
  const coll = await getCollection();
  await coll.createIndex({ token: 1 }, { unique: true });
}

function docToProject(doc: ProjectDoc): ProjectData {
  return {
    token: doc.token,
    name: doc.name,
    template: doc.template,
    userId: doc.userId,
    files: doc.files ?? {},
    dependencies: doc.dependencies ?? {},
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * 生成唯一的 token（用于 URL 与对话关联）
 */
export function generateToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * 根据 token 读取单个项目（从 MongoDB）
 */
export async function getProject(token: string): Promise<ProjectData | null> {
  const coll = await getCollection();
  const doc = await coll.findOne({ token });
  return doc ? docToProject(doc) : null;
}

/**
 * 更新项目元数据（部分更新）
 */
export async function updateProjectMeta(
  token: string,
  updates: Partial<Pick<ProjectMeta, "name" | "template" | "dependencies">>
): Promise<void> {
  const project = await getProject(token);
  if (!project) throw new Error("项目不存在");

  const now = new Date().toISOString();
  const set: Partial<ProjectDoc> = {
    updatedAt: now,
  };
  if (updates.name !== undefined) set.name = updates.name;
  if (updates.template !== undefined) set.template = updates.template;
  if (updates.dependencies !== undefined) set.dependencies = updates.dependencies;

  const coll = await getCollection();
  const result = await coll.updateOne({ token }, { $set: set });
  if (result.matchedCount === 0) throw new Error("项目不存在");
}

/**
 * 更新单个文件
 */
export async function updateFile(token: string, filePath: string, code: string): Promise<void> {
  const project = await getProject(token);
  if (!project) throw new Error("项目不存在");

  const now = new Date().toISOString();
  const newFiles = { ...project.files, [filePath]: { code } };
  const coll = await getCollection();
  const result = await coll.updateOne(
    { token },
    { $set: { files: newFiles, updatedAt: now } }
  );
  if (result.matchedCount === 0) throw new Error("项目不存在");
}

/**
 * 更新多个文件（用传入的 files 整体替换项目中的 files）
 */
export async function updateFiles(
  token: string,
  files: Record<string, { code: string }>
): Promise<void> {
  const project = await getProject(token);
  if (!project) throw new Error("项目不存在");

  const now = new Date().toISOString();
  const coll = await getCollection();
  const result = await coll.updateOne(
    { token },
    { $set: { files: { ...files }, updatedAt: now } }
  );
  if (result.matchedCount === 0) throw new Error("项目不存在");
}

/**
 * 保存项目（完整保存，用于创建新项目）
 */
export async function saveProject(project: ProjectData): Promise<void> {
  await ensureTokenIndex();
  const coll = await getCollection();
  const doc: Omit<ProjectDoc, "_id"> = {
    token: project.token,
    name: project.name,
    template: project.template,
    userId: project.userId,
    files: project.files ?? {},
    dependencies: project.dependencies ?? {},
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  await coll.insertOne(doc as ProjectDoc);
}

/**
 * 获取指定用户的项目列表（从 MongoDB 按 userId 查询）
 */
export async function listProjects(userId: string): Promise<ProjectListItem[]> {
  if (!userId || typeof userId !== "string") return [];

  const coll = await getCollection();
  const docs = await coll
    .find({ userId })
    .sort({ updatedAt: -1 })
    .project({ token: 1, name: 1, updatedAt: 1 })
    .toArray();

  return docs.map((d) => ({
    token: d.token,
    name: d.name,
    updatedAt: d.updatedAt,
  }));
}

/**
 * 删除项目（从 MongoDB 删除，对话由 API 层先删）
 */
export async function deleteProject(token: string): Promise<boolean> {
  const coll = await getCollection();
  const result = await coll.deleteOne({ token });
  return result.deletedCount > 0;
}

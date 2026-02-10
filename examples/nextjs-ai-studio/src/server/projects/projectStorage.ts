import { randomBytes } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { ObjectId } from "mongodb";
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
  dependencies?: Record<string, string>;
  filesPath?: string;
  files?: Record<string, ProjectFile>;
  createdAt: string;
  updatedAt: string;
};

const COLLECTION = "projects";
const PROJECT_FILES_ROOT = path.join(process.cwd(), "data", "projects");

const DEFAULT_PROJECT_FILES: Record<string, ProjectFile> = {
  "/index.js": {
    code: `import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = createRoot(document.getElementById("root"));
root.render(<App />);
`,
  },
  "/App.js": {
    code: `import { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <main className="app">
      <header>
        <p className="badge">Node + React Starter</p>
        <h1>欢迎来到 AI Studio</h1>
        <p className="subtle">从这里开始构建你的全栈组件。</p>
      </header>
      <section className="card">
        <h2>交互示例</h2>
        <p>点击计数器：{count}</p>
        <button onClick={() => setCount((prev) => prev + 1)}>Click me</button>
      </section>
    </main>
  );
}`,
  },
  "/styles.css": {
    code: `.app {
  font-family: "Sora", sans-serif;
  color: #f7f5ff;
  background: radial-gradient(circle at top, #3b2f6d, #101018 65%);
  min-height: 100vh;
  padding: 64px;
}

h1 {
  font-size: 40px;
  letter-spacing: -0.02em;
  margin: 16px 0;
}

p {
  opacity: 0.7;
  margin-top: 12px;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #f7f5ff;
}

.subtle {
  opacity: 0.75;
  max-width: 520px;
}

.card {
  margin-top: 32px;
  padding: 24px;
  border-radius: 16px;
  background: rgba(16, 16, 24, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(8, 8, 16, 0.3);
}

button {
  margin-top: 12px;
  border: 0;
  padding: 10px 16px;
  border-radius: 999px;
  background: #f7f5ff;
  color: #111018;
  font-weight: 600;
  cursor: pointer;
}

h2 {
  margin: 0 0 8px;
}

}`,
  },
};

async function getCollection() {
  const db = await getMongoDb();
  return db.collection<ProjectDoc>(COLLECTION);
}

async function ensureTokenIndex() {
  const coll = await getCollection();
  await coll.createIndex({ token: 1 }, { unique: true });
}

function getProjectDir(token: string): string {
  return path.join(PROJECT_FILES_ROOT, token);
}

function getRelativeFilesPath(token: string): string {
  return path.posix.join("data", "projects", token);
}

function toLocalFilePath(token: string, filePath: string): string {
  const normalizedPosix = path.posix.normalize(filePath.startsWith("/") ? filePath : `/${filePath}`);
  if (!normalizedPosix.startsWith("/")) {
    throw new Error(`非法文件路径: ${filePath}`);
  }
  const relativePosix = normalizedPosix.replace(/^\/+/, "");
  if (!relativePosix || relativePosix.startsWith("..") || relativePosix.includes("\0")) {
    throw new Error(`非法文件路径: ${filePath}`);
  }

  const baseDir = getProjectDir(token);
  const target = path.join(baseDir, ...relativePosix.split("/"));
  const relativeCheck = path.relative(baseDir, target);
  if (!relativeCheck || relativeCheck.startsWith("..") || path.isAbsolute(relativeCheck)) {
    throw new Error(`非法文件路径: ${filePath}`);
  }
  return target;
}

async function ensureProjectDir(token: string): Promise<string> {
  const dir = getProjectDir(token);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function collectFilesFromDir(dir: string): Promise<Record<string, ProjectFile>> {
  const files: Record<string, ProjectFile> = {};

  const walk = async (currentDir: string) => {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath);
        continue;
      }
      if (!entry.isFile()) continue;

      const rel = path.relative(dir, absPath).split(path.sep).join("/");
      const content = await fs.readFile(absPath, "utf8");
      files[`/${rel}`] = { code: content };
    }
  };

  try {
    await walk(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }

  return files;
}

export async function hasProjectFilesDir(token: string): Promise<boolean> {
  try {
    const stat = await fs.stat(getProjectDir(token));
    return stat.isDirectory();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function writeFilesToDir(token: string, files: Record<string, { code: string }>) {
  await fs.rm(getProjectDir(token), { recursive: true, force: true });
  await ensureProjectDir(token);

  await Promise.all(
    Object.entries(files).map(async ([filePath, file]) => {
      const target = toLocalFilePath(token, filePath);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.code, "utf8");
    })
  );
}

async function migrateLegacyFilesIfNeeded(doc: ProjectDoc, coll: Awaited<ReturnType<typeof getCollection>>) {
  const legacyFiles = doc.files;
  if (!legacyFiles || Object.keys(legacyFiles).length === 0) return;

  await writeFilesToDir(doc.token, legacyFiles);
  await coll.updateOne(
    { token: doc.token },
    {
      $set: { filesPath: getRelativeFilesPath(doc.token), updatedAt: new Date().toISOString() },
      $unset: { files: "" },
    }
  );
}

async function docToProject(doc: ProjectDoc, coll: Awaited<ReturnType<typeof getCollection>>): Promise<ProjectData> {
  await migrateLegacyFilesIfNeeded(doc, coll);
  let files = await collectFilesFromDir(getProjectDir(doc.token));

  if (Object.keys(files).length === 0) {
    const hasDir = await hasProjectFilesDir(doc.token);
    if (!hasDir) {
      await writeFilesToDir(doc.token, DEFAULT_PROJECT_FILES);
      await coll.updateOne(
        { token: doc.token },
        {
          $set: {
            filesPath: getRelativeFilesPath(doc.token),
            updatedAt: new Date().toISOString(),
          },
          $unset: { files: "" },
        }
      );
      files = await collectFilesFromDir(getProjectDir(doc.token));
    }
  }

  return {
    token: doc.token,
    name: doc.name,
    template: doc.template,
    userId: doc.userId,
    files,
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
 * 根据 token 读取单个项目（元数据来自 MongoDB，文件来自本地目录）
 */
export async function getProject(token: string): Promise<ProjectData | null> {
  const coll = await getCollection();
  const doc = await coll.findOne({ token });
  return doc ? docToProject(doc, coll) : null;
}

/**
 * 更新项目元数据（部分更新）
 */
export async function updateProjectMeta(
  token: string,
  updates: Partial<Pick<ProjectMeta, "name" | "template" | "dependencies">>
): Promise<void> {
  const coll = await getCollection();
  const exists = await coll.findOne({ token }, { projection: { _id: 1 } });
  if (!exists) throw new Error("项目不存在");

  const now = new Date().toISOString();
  const set: Partial<ProjectDoc> = {
    updatedAt: now,
  };
  if (updates.name !== undefined) set.name = updates.name;
  if (updates.template !== undefined) set.template = updates.template;
  if (updates.dependencies !== undefined) set.dependencies = updates.dependencies;

  const result = await coll.updateOne({ token }, { $set: set });
  if (result.matchedCount === 0) throw new Error("项目不存在");
}

/**
 * 更新单个文件（保存到本地 data/projects/<token>）
 */
export async function updateFile(token: string, filePath: string, code: string): Promise<void> {
  const coll = await getCollection();
  const exists = await coll.findOne({ token }, { projection: { _id: 1 } });
  if (!exists) throw new Error("项目不存在");

  const target = toLocalFilePath(token, filePath);
  await ensureProjectDir(token);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, code, "utf8");

  const now = new Date().toISOString();
  const result = await coll.updateOne(
    { token },
    { $set: { updatedAt: now, filesPath: getRelativeFilesPath(token) }, $unset: { files: "" } }
  );
  if (result.matchedCount === 0) throw new Error("项目不存在");
}

/**
 * 更新多个文件（用传入 files 覆盖本地目录）
 */
export async function updateFiles(
  token: string,
  files: Record<string, { code: string }>
): Promise<void> {
  const coll = await getCollection();
  const exists = await coll.findOne({ token }, { projection: { _id: 1 } });
  if (!exists) throw new Error("项目不存在");

  await writeFilesToDir(token, files);

  const now = new Date().toISOString();
  const result = await coll.updateOne(
    { token },
    { $set: { updatedAt: now, filesPath: getRelativeFilesPath(token) }, $unset: { files: "" } }
  );
  if (result.matchedCount === 0) throw new Error("项目不存在");
}

/**
 * 保存项目（元数据存 Mongo，文件存本地）
 */
export async function saveProject(project: ProjectData): Promise<void> {
  await ensureTokenIndex();
  await writeFilesToDir(project.token, project.files ?? {});

  const coll = await getCollection();
  const doc: Omit<ProjectDoc, "_id"> = {
    token: project.token,
    name: project.name,
    template: project.template,
    userId: project.userId,
    dependencies: project.dependencies ?? {},
    filesPath: getRelativeFilesPath(project.token),
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
 * 删除项目（删除 Mongo 元数据 + 本地文件目录）
 */
export async function deleteProject(token: string): Promise<boolean> {
  const coll = await getCollection();
  const result = await coll.deleteOne({ token });
  await fs.rm(getProjectDir(token), { recursive: true, force: true });
  return result.deletedCount > 0;
}

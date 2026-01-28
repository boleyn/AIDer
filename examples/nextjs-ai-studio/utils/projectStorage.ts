import { promises as fs } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const PROJECTS_DIR = join(process.cwd(), "data", "projects");
const PROJECT_META_FILE = ".project.json";

export type ProjectFile = {
  code: string;
};

export type ProjectMeta = {
  token: string;
  name: string;
  template: string;
  dependencies?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type ProjectData = {
  token: string;
  name: string;
  template: string;
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

/**
 * 确保项目目录存在
 */
async function ensureProjectsDir(): Promise<void> {
  try {
    await fs.access(PROJECTS_DIR);
  } catch {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
  }
}

/**
 * 获取项目目录路径
 */
function getProjectDir(token: string): string {
  return join(PROJECTS_DIR, token);
}

/**
 * 获取项目元数据文件路径
 */
function getProjectMetaPath(token: string): string {
  return join(getProjectDir(token), PROJECT_META_FILE);
}

/**
 * 将文件路径转换为安全的文件名
 * 例如：/App.js -> App.js, /src/components/Button.jsx -> src_components_Button.jsx
 */
function pathToFilename(filePath: string): string {
  // 移除开头的斜杠
  const cleanPath = filePath.startsWith("/") ? filePath.slice(1) : filePath;
  // 将路径分隔符替换为下划线（避免目录嵌套）
  return cleanPath.replace(/\//g, "_");
}

/**
 * 将文件名转换回文件路径
 */
function filenameToPath(filename: string): string {
  // 将下划线替换为路径分隔符
  const path = filename.replace(/_/g, "/");
  // 确保以斜杠开头
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * 生成唯一的token
 */
export function generateToken(): string {
  return randomBytes(16).toString("hex");
}

/**
 * 读取单个项目
 */
export async function getProject(token: string): Promise<ProjectData | null> {
  try {
    await ensureProjectsDir();
    const projectDir = getProjectDir(token);
    const metaPath = getProjectMetaPath(token);

    // 检查项目目录是否存在
    try {
      await fs.access(projectDir);
    } catch {
      return null;
    }

    // 读取项目元数据
    const metaContent = await fs.readFile(metaPath, "utf-8");
    const meta = JSON.parse(metaContent) as ProjectMeta;

    // 读取所有文件
    const files: Record<string, ProjectFile> = {};
    const entries = await fs.readdir(projectDir, { withFileTypes: true });

    for (const entry of entries) {
      // 跳过元数据文件
      if (entry.name === PROJECT_META_FILE) {
        continue;
      }

      // 只处理文件，跳过目录
      if (entry.isFile()) {
        const filePath = filenameToPath(entry.name);
        const fileContent = await fs.readFile(join(projectDir, entry.name), "utf-8");
        files[filePath] = { code: fileContent };
      }
    }

    return {
      token: meta.token,
      name: meta.name,
      template: meta.template,
      files,
      dependencies: meta.dependencies || {},
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.error("Failed to get project:", error);
    throw error;
  }
}

/**
 * 更新项目元数据（部分更新）
 */
export async function updateProjectMeta(
  token: string,
  updates: Partial<Pick<ProjectMeta, "name" | "template" | "dependencies">>
): Promise<void> {
  await ensureProjectsDir();
  const project = await getProject(token);
  if (!project) {
    throw new Error("项目不存在");
  }

  const meta: ProjectMeta = {
    token: project.token,
    name: updates.name !== undefined ? updates.name : project.name,
    template: updates.template || project.template,
    dependencies: updates.dependencies !== undefined ? updates.dependencies : project.dependencies,
    createdAt: project.createdAt,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(getProjectMetaPath(token), JSON.stringify(meta, null, 2), "utf-8");
}

/**
 * 更新单个文件
 */
export async function updateFile(token: string, filePath: string, code: string): Promise<void> {
  await ensureProjectsDir();
  const projectDir = getProjectDir(token);

  // 检查项目是否存在
  const project = await getProject(token);
  if (!project) {
    throw new Error("项目不存在");
  }

  // 保存文件
  const filename = pathToFilename(filePath);
  const fileFullPath = join(projectDir, filename);
  await fs.writeFile(fileFullPath, code, "utf-8");

  // 更新项目元数据的更新时间
  await updateProjectMeta(token, {});
}

/**
 * 更新多个文件
 */
export async function updateFiles(token: string, files: Record<string, { code: string }>): Promise<void> {
  await ensureProjectsDir();
  const projectDir = getProjectDir(token);

  // 检查项目是否存在
  const project = await getProject(token);
  if (!project) {
    throw new Error("项目不存在");
  }

  // 获取现有文件列表
  const existingFiles = new Set<string>();
  try {
    const entries = await fs.readdir(projectDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && entry.name !== PROJECT_META_FILE) {
        existingFiles.add(entry.name);
      }
    }
  } catch {
    // 目录可能不存在，忽略
  }

  // 保存所有文件
  const newFiles = new Set<string>();
  for (const [filePath, fileData] of Object.entries(files)) {
    const filename = pathToFilename(filePath);
    const fileFullPath = join(projectDir, filename);
    await fs.writeFile(fileFullPath, fileData.code, "utf-8");
    newFiles.add(filename);
  }

  // 删除不再存在的文件
  for (const filename of existingFiles) {
    if (!newFiles.has(filename)) {
      await fs.unlink(join(projectDir, filename));
    }
  }

  // 更新项目元数据的更新时间
  await updateProjectMeta(token, {});
}

/**
 * 保存项目（完整保存，用于创建新项目）
 */
export async function saveProject(project: ProjectData): Promise<void> {
  await ensureProjectsDir();
  const projectDir = getProjectDir(project.token);

  // 创建项目目录（如果不存在）
  try {
    await fs.mkdir(projectDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在，忽略错误
  }

  // 保存项目元数据
  const meta: ProjectMeta = {
    token: project.token,
    name: project.name,
    template: project.template,
    dependencies: project.dependencies,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
  await fs.writeFile(getProjectMetaPath(project.token), JSON.stringify(meta, null, 2), "utf-8");

  // 保存所有文件
  for (const [filePath, fileData] of Object.entries(project.files)) {
    const filename = pathToFilename(filePath);
    const fileFullPath = join(projectDir, filename);
    await fs.writeFile(fileFullPath, fileData.code, "utf-8");
  }
}

/**
 * 获取所有项目列表（仅基本信息）
 */
export async function listProjects(): Promise<ProjectListItem[]> {
  try {
    await ensureProjectsDir();
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true });

    const projects: ProjectListItem[] = [];

    for (const entry of entries) {
      // 只处理目录
      if (!entry.isDirectory()) {
        continue;
      }

      const token = entry.name;
      const metaPath = getProjectMetaPath(token);

      try {
        const metaContent = await fs.readFile(metaPath, "utf-8");
        const meta = JSON.parse(metaContent) as ProjectMeta;
        projects.push({
          token: meta.token,
          name: meta.name,
          updatedAt: meta.updatedAt,
        });
      } catch (error) {
        // 跳过无法解析的项目
        console.error(`Failed to parse project ${token}:`, error);
      }
    }

    // 按更新时间倒序排序
    projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return projects;
  } catch (error) {
    // 如果目录不存在，返回空数组
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    console.error("Failed to list projects:", error);
    throw error;
  }
}

/**
 * 删除项目
 */
export async function deleteProject(token: string): Promise<boolean> {
  try {
    await ensureProjectsDir();
    const projectDir = getProjectDir(token);

    // 检查项目目录是否存在
    try {
      await fs.access(projectDir);
    } catch {
      return false;
    }

    // 删除整个项目目录
    await fs.rm(projectDir, { recursive: true, force: true });
    return true;
  } catch (error) {
    console.error("Failed to delete project:", error);
    throw error;
  }
}

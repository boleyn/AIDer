import type { NextApiRequest, NextApiResponse } from "next";
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";
import {
  listProjects,
  getProject,
  saveProject,
  generateToken,
  type ProjectData,
} from "../../utils/projectStorage";

type ProjectListItem = {
  token: string;
  name: string;
  updatedAt: string;
};

type CreateProjectRequest = {
  name?: string;
  template?: SandpackPredefinedTemplate;
  files?: Record<string, { code: string }>;
  dependencies?: Record<string, string>;
};

// 默认项目模板
const DEFAULT_TEMPLATE: SandpackPredefinedTemplate = "react";
const DEFAULT_FILES: Record<string, { code: string }> = {
  "/App.js": {
    code: `import "./styles.css";

export default function App() {
  return (
    <main className="app">
      <h1>新项目</h1>
      <p>开始编写你的代码吧！</p>
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
}

p {
  opacity: 0.7;
  margin-top: 12px;
}`,
  },
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "GET") {
    // 获取所有项目列表
    try {
      const projects = await listProjects();
      res.status(200).json(projects);
    } catch (error) {
      console.error("Failed to list projects:", error);
      res.status(500).json({ error: "获取项目列表失败" });
    }
    return;
  }

  if (req.method === "POST") {
    // 创建新项目
    try {
      const body = req.body as CreateProjectRequest;
      const token = generateToken();
      const now = new Date().toISOString();

      const project: ProjectData = {
        token,
        name: body.name || "未命名项目",
        template: body.template || DEFAULT_TEMPLATE,
        files: body.files || DEFAULT_FILES,
        dependencies: body.dependencies || {},
        createdAt: now,
        updatedAt: now,
      };

      await saveProject(project);

      res.status(201).json({
        token: project.token,
        name: project.name,
        template: project.template,
        files: project.files,
        dependencies: project.dependencies,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    } catch (error) {
      console.error("Failed to create project:", error);
      res.status(500).json({ error: "创建项目失败" });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: `方法 ${req.method} 不被允许` });
};

export default handler;

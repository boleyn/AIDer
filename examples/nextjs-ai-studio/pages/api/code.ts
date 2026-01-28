import type { NextApiRequest, NextApiResponse } from "next";
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";
import {
  getProject,
  updateProjectMeta,
  updateFile,
  updateFiles,
} from "../../utils/projectStorage";

type PatchProjectRequest = {
  name?: string;
  template?: SandpackPredefinedTemplate;
  dependencies?: Record<string, string>;
};

type UpdateFileRequest = {
  path: string;
  code: string;
};

type UpdateFilesRequest = {
  files: Record<string, { code: string }>;
  name?: string;
  template?: SandpackPredefinedTemplate;
  dependencies?: Record<string, string>;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!token) {
    res.status(400).json({ error: "缺少token参数" });
    return;
  }

  if (req.method === "GET") {
    // 读取项目详情
    try {
      const project = await getProject(token);
      if (!project) {
        res.status(404).json({ error: "项目不存在" });
        return;
      }

      // 返回Sandpack格式的数据
      res.status(200).json({
        template: project.template,
        files: project.files,
        dependencies: project.dependencies || {},
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    } catch (error) {
      console.error("Failed to get project:", error);
      res.status(500).json({ error: "获取项目失败" });
    }
    return;
  }

  if (req.method === "PATCH") {
    // 部分更新项目（只更新元数据：name, template, dependencies）
    try {
      const project = await getProject(token);
      if (!project) {
        res.status(404).json({ error: "项目不存在" });
        return;
      }

      const body = req.body as PatchProjectRequest;
      await updateProjectMeta(token, {
        name: body.name,
        template: body.template,
        dependencies: body.dependencies,
      });

      const updatedProject = await getProject(token);
      res.status(200).json({
        token: updatedProject!.token,
        name: updatedProject!.name,
        template: updatedProject!.template,
        dependencies: updatedProject!.dependencies,
        updatedAt: updatedProject!.updatedAt,
      });
    } catch (error) {
      console.error("Failed to update project:", error);
      res.status(500).json({ error: "更新项目失败" });
    }
    return;
  }

  if (req.method === "PUT") {
    // 更新文件（支持单文件或批量）
    const action = typeof req.query.action === "string" ? req.query.action : "files";
    const body = req.body as Partial<UpdateFileRequest & UpdateFilesRequest>;

    // 优先识别单文件更新，避免误触发批量更新删除其它文件
    const isSingleFileUpdate = typeof body.path === "string" && typeof body.code === "string";

    if (action === "file" || isSingleFileUpdate) {
      try {
        const project = await getProject(token);
        if (!project) {
          res.status(404).json({ error: "项目不存在" });
          return;
        }

        if (!body.path || typeof body.code !== "string") {
          res.status(400).json({ error: "缺少path或code参数" });
          return;
        }

        await updateFile(token, body.path, body.code);
        res.status(200).json({ success: true });
      } catch (error) {
        console.error("Failed to update file:", error);
        res.status(500).json({ error: "更新文件失败" });
      }
      return;
    }

    // 更新多个文件（批量更新）
    try {
      const project = await getProject(token);
      if (!project) {
        res.status(404).json({ error: "项目不存在" });
        return;
      }

      if (!body.files || typeof body.files !== "object") {
        res.status(400).json({ error: "缺少files参数" });
        return;
      }

      if (body.name !== undefined || body.template !== undefined || body.dependencies !== undefined) {
        await updateProjectMeta(token, {
          name: body.name,
          template: body.template,
          dependencies: body.dependencies,
        });
      }

      await updateFiles(token, body.files);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to update files:", error);
      res.status(500).json({ error: "更新文件失败" });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PATCH", "PUT"]);
  res.status(405).json({ error: `方法 ${req.method} 不被允许` });
};

export default handler;

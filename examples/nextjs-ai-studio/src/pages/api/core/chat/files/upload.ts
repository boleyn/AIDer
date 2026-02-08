import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { requireAuth } from "@server/auth/session";
import type { NextApiRequest, NextApiResponse } from "next";

interface UploadFileInput {
  name: string;
  type?: string;
  lastModified?: number;
  contentBase64: string;
}

interface UploadFileResult {
  name: string;
  type: string;
  size: number;
  lastModified: number;
  storagePath: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 20;

const toSafeSegment = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "unknown";

const toSafeFileName = (value: string) => {
  const base = path.basename(value || "file");
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "file";
};

const getToken = (req: NextApiRequest): string | null =>
  typeof req.body?.token === "string" ? req.body.token : null;

const getChatId = (req: NextApiRequest): string | null =>
  typeof req.body?.chatId === "string" ? req.body.chatId : null;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ files: UploadFileResult[] } | { error: string }>
) {
  const auth = await requireAuth(req, res);
  if (!auth) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).json({ error: `方法 ${req.method} 不被允许` });
    return;
  }

  const token = getToken(req);
  const chatId = getChatId(req);
  if (!token || !chatId) {
    res.status(400).json({ error: "缺少 token 或 chatId 参数" });
    return;
  }

  const files = Array.isArray(req.body?.files) ? (req.body.files as UploadFileInput[]) : [];
  if (files.length === 0) {
    res.status(400).json({ error: "缺少 files 参数" });
    return;
  }
  if (files.length > MAX_FILES) {
    res.status(400).json({ error: `单次最多上传 ${MAX_FILES} 个文件` });
    return;
  }

  const dir = path.join(
    process.cwd(),
    "data",
    "chat_uploads",
    toSafeSegment(token),
    toSafeSegment(chatId)
  );
  await mkdir(dir, { recursive: true });

  const now = Date.now();
  const results: UploadFileResult[] = [];

  for (let i = 0; i < files.length; i += 1) {
    const file = files[i];
    if (!file || typeof file.name !== "string" || typeof file.contentBase64 !== "string") {
      continue;
    }

    const buffer = Buffer.from(file.contentBase64, "base64");
    if (buffer.byteLength > MAX_FILE_SIZE) {
      res.status(400).json({ error: `文件 ${file.name} 超过 ${MAX_FILE_SIZE / (1024 * 1024)}MB 限制` });
      return;
    }

    const safeName = toSafeFileName(file.name);
    const fileName = `${now}-${i}-${safeName}`;
    const absolutePath = path.join(dir, fileName);
    await writeFile(absolutePath, buffer);

    const storagePath = path.relative(process.cwd(), absolutePath).replaceAll(path.sep, "/");
    results.push({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: buffer.byteLength,
      lastModified: Number.isFinite(Number(file.lastModified))
        ? Number(file.lastModified)
        : now,
      storagePath,
    });
  }

  res.status(200).json({ files: results });
}

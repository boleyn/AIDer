import { z } from "zod";
import type { ChangeTracker, GlobalToolInput } from "../../agentTools";
import { globalToolSchema, runGlobalAction } from "../../agentTools";
import type { AgentToolDefinition } from "./types";

const listFilesSchema = z.object({});
const readFileSchema = z.object({ path: z.string() });
const writeFileSchema = z.object({ path: z.string(), content: z.string() });
const replaceInFileSchema = z.object({ path: z.string(), query: z.string(), replace: z.string() });
const searchInFilesSchema = z.object({ query: z.string(), limit: z.number().int().min(1).max(200).optional() });

const toJsonSchema = (schema: z.ZodTypeAny): Record<string, unknown> => {
  if (schema === listFilesSchema) return { type: "object", properties: {} };
  if (schema === readFileSchema) {
    return {
      type: "object",
      properties: { path: { type: "string", description: "以 / 开头的文件路径" } },
      required: ["path"],
    };
  }
  if (schema === writeFileSchema) {
    return {
      type: "object",
      properties: {
        path: { type: "string", description: "以 / 开头的文件路径" },
        content: { type: "string", description: "写入的完整内容" },
      },
      required: ["path", "content"],
    };
  }
  if (schema === replaceInFileSchema) {
    return {
      type: "object",
      properties: {
        path: { type: "string", description: "以 / 开头的文件路径" },
        query: { type: "string", description: "需要替换的文本" },
        replace: { type: "string", description: "替换后的文本" },
      },
      required: ["path", "query", "replace"],
    };
  }
  if (schema === searchInFilesSchema) {
    return {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        limit: { type: "integer", minimum: 1, maximum: 200, description: "最多返回条数" },
      },
      required: ["query"],
    };
  }
  return { type: "object" };
};

const safeParse = <T>(schema: z.ZodTypeAny, input: unknown): { ok: true; data: T } | { ok: false; error: string } => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors.map((err) => err.message).join("; ") };
  }
  return { ok: true, data: parsed.data as T };
};

export function createProjectTools(token: string, changeTracker: ChangeTracker): AgentToolDefinition[] {
  return [
    {
      name: "list_files",
      description: "列出项目中的所有文件路径。",
      parameters: toJsonSchema(listFilesSchema),
      run: async (input) => {
        const parsed = safeParse(listFilesSchema, input);
        if (!parsed.ok) throw new Error(parsed.error);
        return runGlobalAction(token, { action: "list" }, changeTracker);
      },
    },
    {
      name: "read_file",
      description: "读取项目中的文件内容。",
      parameters: toJsonSchema(readFileSchema),
      run: async (input) => {
        const parsed = safeParse<{ path: string }>(readFileSchema, input);
        if (!parsed.ok) throw new Error(parsed.error);
        return runGlobalAction(token, { action: "read", path: parsed.data.path }, changeTracker);
      },
    },
    {
      name: "write_file",
      description: "在项目中创建或覆盖文件内容。",
      parameters: toJsonSchema(writeFileSchema),
      run: async (input) => {
        const parsed = safeParse<{ path: string; content: string }>(writeFileSchema, input);
        if (!parsed.ok) throw new Error(parsed.error);
        return runGlobalAction(
          token,
          { action: "write", path: parsed.data.path, content: parsed.data.content },
          changeTracker
        );
      },
    },
    {
      name: "replace_in_file",
      description: "替换文件中的指定文本。",
      parameters: toJsonSchema(replaceInFileSchema),
      run: async (input) => {
        const parsed = safeParse<{ path: string; query: string; replace: string }>(replaceInFileSchema, input);
        if (!parsed.ok) throw new Error(parsed.error);
        return runGlobalAction(
          token,
          { action: "replace", path: parsed.data.path, query: parsed.data.query, replace: parsed.data.replace },
          changeTracker
        );
      },
    },
    {
      name: "search_in_files",
      description: "在项目中搜索指定关键词。",
      parameters: toJsonSchema(searchInFilesSchema),
      run: async (input) => {
        const parsed = safeParse<{ query: string; limit?: number }>(searchInFilesSchema, input);
        if (!parsed.ok) throw new Error(parsed.error);
        return runGlobalAction(
          token,
          { action: "search", query: parsed.data.query, limit: parsed.data.limit },
          changeTracker
        );
      },
    },
    {
      name: "global",
      description: "通用文件操作工具，支持 list/read/write/replace/search。",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "read", "write", "replace", "search"] },
          path: { type: "string" },
          content: { type: "string" },
          query: { type: "string" },
          replace: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 200 },
        },
        required: ["action"],
      },
      run: async (input) => {
        const parsed = globalToolSchema.safeParse(input);
        if (!parsed.success) {
          throw new Error(parsed.error.errors.map((err) => err.message).join("; "));
        }
        return runGlobalAction(token, parsed.data as GlobalToolInput, changeTracker);
      },
    },
  ];
}

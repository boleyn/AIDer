import { tool } from "langchain";
import { z } from "zod";
import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker } from "../../agentTools";
import { runGlobalAction } from "../../agentTools";

export function createReplaceInFileTool(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface {
  return tool(
    async (input: { path: string; query: string; replace: string }) => {
      return runGlobalAction(
        token,
        { action: "replace", path: input.path, query: input.query, replace: input.replace },
        changeTracker
      );
    },
    {
      name: "replace_in_file",
      description: "在指定文件中替换内容。",
      schema: z.object({
        path: z.string().describe("文件路径"),
        query: z.string().describe("要查找的文本"),
        replace: z.string().describe("替换后的文本"),
      }),
    }
  );
}

import { tool } from "langchain";
import { z } from "zod";
import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker } from "../../agentTools";
import { runGlobalAction } from "../../agentTools";

export function createReadFileTool(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface {
  return tool(
    async (input: { path: string }) => {
      return runGlobalAction(token, { action: "read", path: input.path }, changeTracker);
    },
    {
      name: "read_file",
      description: "读取项目中的文件内容。",
      schema: z.object({
        path: z.string().describe("以 / 开头的文件路径"),
      }),
    }
  );
}

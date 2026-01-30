import { tool } from "langchain";
import { z } from "zod";
import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker } from "../../agentTools";
import { runGlobalAction } from "../../agentTools";

export function createWriteFileTool(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface {
  return tool(
    async (input: { path: string; content: string }) => {
      return runGlobalAction(
        token,
        { action: "write", path: input.path, content: input.content },
        changeTracker
      );
    },
    {
      name: "write_file",
      description: "新建或覆盖文件内容。",
      schema: z.object({
        path: z.string().describe("文件路径"),
        content: z.string().describe("完整文件内容"),
      }),
    }
  );
}

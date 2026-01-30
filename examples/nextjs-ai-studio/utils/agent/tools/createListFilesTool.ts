import { tool } from "langchain";
import { z } from "zod";
import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker } from "../../agentTools";
import { runGlobalAction } from "../../agentTools";

export function createListFilesTool(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface {
  return tool(
    async () => {
      return runGlobalAction(token, { action: "list" }, changeTracker);
    },
    {
      name: "list_files",
      description: "列出项目所有文件路径。",
      schema: z.object({}),
    }
  );
}

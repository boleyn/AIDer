import { tool } from "langchain";
import { z } from "zod";
import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker } from "../../agentTools";
import { runGlobalAction } from "../../agentTools";

export function createSearchInFilesTool(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface {
  return tool(
    async (input: { query: string; limit?: number }) => {
      return runGlobalAction(
        token,
        { action: "search", query: input.query, limit: input.limit },
        changeTracker
      );
    },
    {
      name: "search_in_files",
      description: "在所有文件中搜索关键字。",
      schema: z.object({
        query: z.string().describe("搜索关键字"),
        limit: z.number().int().min(1).max(200).optional(),
      }),
    }
  );
}

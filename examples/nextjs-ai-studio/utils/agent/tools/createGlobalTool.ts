import { tool } from "langchain";
import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker, GlobalToolInput } from "../../agentTools";
import { globalToolSchema, runGlobalAction } from "../../agentTools";

export function createGlobalTool(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface {
  return tool(
    async (input: GlobalToolInput) => {
      return runGlobalAction(token, input, changeTracker);
    },
    {
      name: "global",
      description:
        "通用文件操作工具，支持 list/read/write/replace/search，用于 AI IDE 的全局指令。",
      schema: globalToolSchema,
    }
  );
}

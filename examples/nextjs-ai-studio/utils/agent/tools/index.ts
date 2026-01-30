import type { ToolInterface } from "@langchain/core/tools";
import type { ChangeTracker } from "../../agentTools";
import { createGlobalTool } from "./createGlobalTool";
import { createListFilesTool } from "./createListFilesTool";
import { createReadFileTool } from "./createReadFileTool";
import { createReplaceInFileTool } from "./createReplaceInFileTool";
import { createSearchInFilesTool } from "./createSearchInFilesTool";
import { createWriteFileTool } from "./createWriteFileTool";

export function createProjectTools(
  token: string,
  changeTracker: ChangeTracker
): ToolInterface[] {
  return [
    createListFilesTool(token, changeTracker),
    createReadFileTool(token, changeTracker),
    createWriteFileTool(token, changeTracker),
    createReplaceInFileTool(token, changeTracker),
    createSearchInFilesTool(token, changeTracker),
    createGlobalTool(token, changeTracker),
  ];
}

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { ToolInterface } from "@langchain/core/tools";

export type MCPServerConfig = {
  name: string;
  url: string;
};

let cachedClient: MultiServerMCPClient | null = null;
let cachedServersKey = "";

function parseServers(raw: string | undefined): MCPServerConfig[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as MCPServerConfig[];
    if (Array.isArray(parsed)) {
      return parsed.filter((entry) => entry && entry.name && entry.url);
    }
  } catch {
    // fallback to comma-separated list
  }
  return raw
    .split(",")
    .map((entry, index) => ({
      name: `mcp-${index + 1}`,
      url: entry.trim(),
    }))
    .filter((entry) => entry.url.length > 0);
}

export async function loadMcpTools(): Promise<ToolInterface[]> {
  const servers = parseServers(process.env.MCP_SERVER_URLS || process.env.MCP_SERVERS);
  if (servers.length === 0) {
    return [];
  }

  const key = JSON.stringify(servers);
  if (!cachedClient || cachedServersKey !== key) {
    cachedClient = new MultiServerMCPClient({
      mcpServers: Object.fromEntries(
        servers.map((server) => [
          server.name,
          {
            transport: "sse" as const,
            url: server.url,
          },
        ])
      ),
    });
    cachedServersKey = key;
  }

  return cachedClient.getTools() as Promise<ToolInterface[]>;
}

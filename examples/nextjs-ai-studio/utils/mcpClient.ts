import type { AgentToolDefinition } from "./agent/tools/types";

export type MCPServerConfig = {
  name: string;
  url: string;
};

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

export async function loadMcpTools(): Promise<AgentToolDefinition[]> {
  const servers = parseServers(process.env.MCP_SERVER_URLS || process.env.MCP_SERVERS);
  if (servers.length === 0) return [];
  // MCP integration relied on LangChain adapters. Keep placeholder for future adapters.
  return [];
}

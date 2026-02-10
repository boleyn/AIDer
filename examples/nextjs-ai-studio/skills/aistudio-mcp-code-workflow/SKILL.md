---
name: aistudio-mcp-code-workflow
description: This skill should be used when the user asks to implement, fix, refactor, or analyze code in this project and requires MCP-first reference discovery. Trigger when requests involve “改代码”, “修复 bug”, “实现功能”, “重构”, “按参考页实现”, or similar coding tasks.
version: 0.1.0
---

# AI Studio MCP-first Coding Workflow

Follow this skill for coding tasks in this repository.

## Required Input

- User request text.
- Available tools list for current turn.

## Execution Workflow

1. **Discover capabilities first**: inspect available MCP servers and tools in this turn before choosing a workflow.
2. **Select MCP path dynamically**:
   - If a project-knowledge MCP server is available (e.g. GitLab KB), use it first for project/reference facts.
   - If not available, continue with other available MCP providers and local repository inspection.
3. Inspect local code with available local tools (shell/file search/read/edit) and keep reads minimal.
4. Implement with targeted file edits and keep scope strictly aligned to user intent.
5. Validate with project build/tests when available.
6. Summarize changed files and behavior impact.

## OpenAI / Context7 Rule

When the task involves OpenAI SDK/API usage:

1. Resolve library ID via Context7 first.
2. Query docs from the resolved library.
3. Match examples to the project's installed major version before implementation.
4. Prefer primary official docs/snippets over secondary sources.

Recommended IDs:

- `/openai/openai-node` (latest docs)
- `/openai/openai-node/v4_104_0` when project is on v4-compatible code paths.

If project version and docs version differ, explicitly call out compatibility assumptions.

## Hard Rules

- Use function call and MCP tools only.
- Avoid prompt-encoded pseudo tool-calling formats.
- Read target files before claiming code changes.
- Run MCP reference steps before implementation changes when relevant MCP exists.
- Keep edits scoped to user intent.
- Never hard-code unavailable server/tool names; always bind workflow to discovered capabilities in the current turn.

## Tool Strategy

- Prefer fast search (`rg` or equivalent) before broad file reads.
- Prefer targeted patch/edit operations over full-file rewrites.
- Use file creation/write only when adding new files or intentionally replacing complete content.
- Use multiple tools in parallel only when operations are independent.

## Failure / Fallback

- If a referenced MCP server is not available in the current session, report it briefly and continue with available MCP + local code workflow.
- If a required tool name in this skill doesn't exist in the current runtime, map the step to the closest available tool and continue.
- Do not block implementation solely because one optional MCP source is unavailable.

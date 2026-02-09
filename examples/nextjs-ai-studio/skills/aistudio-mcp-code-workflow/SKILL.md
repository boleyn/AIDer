---
name: aistudio-mcp-code-workflow
description: This skill should be used when the user asks to implement, fix, refactor, or analyze code in this project and requires MCP-first reference discovery. Trigger when requests involve “改代码”, “修复 bug”, “实现功能”, “重构”, “按参考页实现”, or similar coding tasks that must follow: list_projects -> get_project_details -> get_analysis_page -> local code tools.
version: 0.1.0
---

# AI Studio MCP-first Coding Workflow

Follow this skill for coding tasks in this repository.

## Required Input

- User request text.
- Available tools list for current turn.

## Execution Workflow

1. Call `mcp_mcp-gitlab-kb__list_projects`.
2. Call `mcp_mcp-gitlab-kb__get_project_details` using the relevant project from step 1.
3. Call `mcp_mcp-gitlab-kb__get_analysis_page` to obtain analysis/prototype reference.
4. Inspect local code with `list_files`, `search_in_files`, `read_file`.
5. Implement with `replace_in_file` or `write_file` and keep edits minimal.
6. Validate with project build/tests when available.
7. Summarize changed files and behavior impact.

## Hard Rules

- Use function call and MCP tools only.
- Avoid prompt-encoded pseudo tool-calling formats.
- Read target files before claiming code changes.
- Run MCP reference steps before implementation changes.
- Keep edits scoped to user intent.

## Tool Strategy

- Prefer `search_in_files` before broad `read_file` loops.
- Prefer `replace_in_file` for targeted modifications.
- Use `write_file` when creating files or replacing full content intentionally.
- Use `global` only when specific local tool shapes are insufficient.


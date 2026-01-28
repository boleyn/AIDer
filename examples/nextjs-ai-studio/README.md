# Next.js AI Studio (Fullstack)

这是一个前后端一体化示例：
- **前端**：Next.js 页面 + Sandpack 运行远程代码
- **后端**：Next.js API Route `/api/code` 根据 token 返回代码包

## 启动

```bash
cd examples/nextjs-ai-studio
yarn
yarn dev
```

访问：
- `http://localhost:3000`
- `http://localhost:3000/run/hello`
- `http://localhost:3000/run/three`

## AI 代码智能体

- API：`POST /api/agent?token=<token>`
- 流式输出：`POST /api/agent?token=<token>&stream=1`（SSE）
- 需要配置 `.env`（支持 OpenAI / Google）
- 选择模型提供方：`AI_PROVIDER=openai` 或 `AI_PROVIDER=google`
- OpenAI：`OPENAI_API_KEY`（可选 `OPENAI_MODEL` / `AI_MODEL`，代理用 `OPENAI_BASE_URL`）
- Google：`GOOGLE_API_KEY`（可选 `GOOGLE_MODEL`，代理用 `GOOGLE_BASE_URL`）
- 支持 `/global` 指令：查看、搜索、替换文件内容等
- 可通过 `MCP_SERVER_URLS`（JSON 或逗号分隔）接入 MCP 工具

示例：
```
/global list
/global {"action":"read","path":"/App.js"}
```

## API 返回格式

`/api/code?token=<token>` 返回示例：

```json
{
  "template": "react",
  "files": {
    "/App.js": "export default function App() { return <h1>Hi</h1>; }"
  },
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

你可以把 API Route 替换成真实的后端逻辑（数据库 / Git / 对象存储）。

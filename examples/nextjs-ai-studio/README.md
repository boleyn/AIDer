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
- `http://localhost:3000/project/hello`
- `http://localhost:3000/project/three`

## 目录分包（重构后）

项目已按前后端一体化方式拆分到 `src/`：

- `src/pages`：页面路由与 API Route（Next.js Pages Router）
- `src/server`：服务端能力（鉴权、存储仓库、Agent 工具）
- `src/features`：业务特性模块（如 `chat`、`dashboard`、`auth`）
- `src/components`：跨页面 UI 组件
- `src/shared`：跨业务共享基础能力（消息解析、流式请求、polyfill）
- `src/ai`、`src/global`：AI 领域模型与兼容层
- `src/utils`：预留（本次已将通用能力收口到 `src/shared`）

并新增别名：

- `@server/* -> src/server/*`
- `@features/* -> src/features/*`
- `@shared/* -> src/shared/*`
- `@/* -> src/*`

## AI 代码智能体

- API：`POST /api/agent?token=<token>`
- 流式输出：`POST /api/agent?token=<token>&stream=1`（SSE）
- 需要配置 `.env`（支持 OpenAI / Google）
- 选择模型提供方：`AI_PROVIDER=openai` 或 `AI_PROVIDER=google`
- OpenAI：`OPENAI_API_KEY`（可选 `OPENAI_MODEL` / `AI_MODEL`，代理用 `OPENAI_BASE_URL`）
- Google：`GOOGLE_API_KEY`（可选 `GOOGLE_MODEL`，代理用 `GOOGLE_BASE_URL`）
- 支持 `/global` 指令：查看、搜索、替换文件内容等
- 可通过 `MCP_SERVER_URLS`（AIChat 风格 JSON 或逗号分隔）接入 MCP 工具
- 支持 SSE MCP Server（如 `http://host:port/sse`），并自动注入为可调用函数工具
- 可选为每个 MCP server 传递 `headers`

示例：
```env
MCP_SERVER_URLS=[{"name":"mcp-gitlab-kb","url":"http://10.21.8.6:8008/sse"}]
```

带鉴权头：
```env
MCP_SERVER_URLS=[{"name":"mcp-private","url":"https://example.com/sse","headers":{"Authorization":"Bearer xxx"}}]
```

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

## 登录鉴权与飞书快捷登录

本示例已加入账号登录/注册与飞书快捷登录：

- 账号登录/注册：`/login`
- 飞书登录回调：`/auth/feishu/callback`
- 服务端鉴权：所有 `api/*` 已要求登录（携带 `Authorization: Bearer <token>` 或 `auth_token` Cookie）

需要配置以下环境变量：

```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret

# 飞书 OAuth
NEXT_PUBLIC_FEISHU_APP_ID=your_feishu_app_id
NEXT_PUBLIC_FEISHU_REDIRECT_URI=http://localhost:3000/auth/feishu/callback
FEISHU_APP_SECRET=your_feishu_app_secret
FEISHU_DEFAULT_PASSWORD=Feishu@123456
```

说明：
- 飞书登录若发现账号不存在，会自动注册并写入默认密码（`FEISHU_DEFAULT_PASSWORD`）。

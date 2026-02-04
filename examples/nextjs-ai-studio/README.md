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

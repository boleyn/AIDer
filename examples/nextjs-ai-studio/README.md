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

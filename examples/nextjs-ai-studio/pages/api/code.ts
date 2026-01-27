import type { NextApiRequest, NextApiResponse } from "next";

type SandpackPayload = {
  template: string;
  files: Record<string, { code: string }>;
  dependencies?: Record<string, string>;
};

const templates: Record<string, SandpackPayload> = {
  hello: {
    template: "react",
    files: {
      "/App.js": {
        code: `import "./styles.css";

export default function App() {
  return (
    <main className="app">
      <h1>Hello from API</h1>
      <p>This project is loaded from the Next.js API route.</p>
    </main>
  );
}`,
      },
      "/styles.css": {
        code: `.app {
  font-family: "Sora", sans-serif;
  color: #f7f5ff;
  background: linear-gradient(135deg, #15162b, #0b0c10);
  min-height: 100vh;
  padding: 48px;
}`,
      },
    },
  },
  three: {
    template: "react",
    files: {
      "/App.js": {
        code: `import { Canvas } from "@react-three/fiber";

export default function App() {
  return (
    <div style={{ height: "100vh" }}>
      <Canvas>
        <ambientLight />
        <mesh rotation={[0.4, 0.4, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#9dffaf" />
        </mesh>
      </Canvas>
    </div>
  );
}`,
      },
    },
    dependencies: {
      "@react-three/fiber": "^8.15.12",
      "three": "^0.160.0"
    }
  }
};

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";

  if (!token) {
    res.status(400).json({ error: "Missing token" });
    return;
  }

  const payload = templates[token] || templates.hello;
  res.status(200).json(payload);
};

export default handler;

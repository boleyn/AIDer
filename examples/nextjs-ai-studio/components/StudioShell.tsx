import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";

import TopBar from "./TopBar";
import ChatPanel from "./ChatPanel";
import WorkspaceShell from "./WorkspaceShell";

type SandpackFile = { code: string };
export type SandpackFiles = Record<string, SandpackFile>;

type ProjectStatus = "idle" | "loading" | "ready" | "error";

type StudioShellProps = {
  initialToken?: string;
};

type ActiveView = "preview" | "code";

const DEFAULT_TEMPLATE: SandpackPredefinedTemplate = "react";

const fallbackFiles: SandpackFiles = {
  "/App.js": {
    code: `import "./styles.css";

export default function App() {
  return (
    <main className="app">
      <h1>AI Studio Proxy</h1>
      <p>Paste a code token in the top bar to load a remote project.</p>
    </main>
  );
}`,
  },
  "/styles.css": {
    code: `.app {
  font-family: "Sora", sans-serif;
  color: #f7f5ff;
  background: radial-gradient(circle at top, #3b2f6d, #101018 65%);
  min-height: 100vh;
  padding: 64px;
}

h1 {
  font-size: 40px;
  letter-spacing: -0.02em;
}

p {
  opacity: 0.7;
  margin-top: 12px;
}`,
  },
};

const normalizeFiles = (rawFiles: unknown): SandpackFiles | null => {
  if (!rawFiles || typeof rawFiles !== "object") {
    return null;
  }

  const output: SandpackFiles = {};
  Object.entries(rawFiles as Record<string, unknown>).forEach(([path, value]) => {
    if (typeof value === "string") {
      output[path] = { code: value };
      return;
    }
    if (
      value &&
      typeof value === "object" &&
      "code" in value &&
      typeof (value as SandpackFile).code === "string"
    ) {
      output[path] = value as SandpackFile;
    }
  });

  return Object.keys(output).length > 0 ? output : null;
};

const StudioShell = ({ initialToken = "" }: StudioShellProps) => {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<ProjectStatus>(
    initialToken ? "loading" : "idle"
  );
  const [error, setError] = useState("");
  const [template, setTemplate] = useState<SandpackPredefinedTemplate>(DEFAULT_TEMPLATE);
  const [files, setFiles] = useState<SandpackFiles | null>(null);
  const [dependencies, setDependencies] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState<ActiveView>("preview");
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);

  const loadProject = useCallback(async (requestedToken: string) => {
    if (!requestedToken) {
      setError("需要一个编码 (token) 才能加载项目。你也可以用 /run/<token> 作为路径。");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await fetch(
        `/api/code?token=${encodeURIComponent(requestedToken)}`
      );
      if (!response.ok) {
        throw new Error(`服务返回 ${response.status}`);
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const nextTemplate = payload.template || (payload.sandpack as Record<string, unknown>)?.template;
      const nextFiles = normalizeFiles(
        (payload as Record<string, unknown>).files ||
          (payload as Record<string, { files?: unknown }>).sandpack?.files
      );
      const nextDependencies =
        (payload as Record<string, unknown>).dependencies ||
        (payload as Record<string, { dependencies?: Record<string, string> }>)
          .sandpack?.dependencies ||
        {};

      setTemplate((nextTemplate as SandpackPredefinedTemplate) || DEFAULT_TEMPLATE);
      setFiles(nextFiles);
      setDependencies(nextDependencies as Record<string, string>);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请检查后端接口。 ");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (initialToken) {
      loadProject(initialToken);
    }
  }, [initialToken, loadProject]);

  useEffect(() => {
    if (!topBarRef.current) {
      return;
    }
    const element = topBarRef.current;
    const updateHeight = () => {
      setTopBarHeight(element.getBoundingClientRect().height);
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const sandpackFiles = useMemo<SandpackFiles>(
    () => files || fallbackFiles,
    [files]
  );

  const customSetup = useMemo(() => {
    if (!dependencies || Object.keys(dependencies).length === 0) {
      return undefined;
    }
    return { dependencies };
  }, [dependencies]);

  const handleLoadClick = () => {
    if (!token) {
      loadProject("");
      return;
    }
    window.history.replaceState(null, "", `/run/${encodeURIComponent(token)}`);
    loadProject(token);
  };

  const chromeOffset = 44;
  const workspaceHeight = topBarHeight
    ? `calc(100vh - ${topBarHeight}px - ${chromeOffset}px)`
    : "100vh";

  return (
    <Flex direction="column" h="100vh" bg="transparent" p={{ base: 3, md: 4 }} gap={3}>
      <Box ref={topBarRef}>
        <TopBar
          token={token}
          loading={status === "loading"}
          onTokenChange={setToken}
          onLoad={handleLoadClick}
        />
      </Box>

      <Flex as="main" align="stretch" gap={4} flex="1" minH="0">
        <ChatPanel />
        <WorkspaceShell
          template={template}
          files={sandpackFiles}
          customSetup={customSetup}
          status={status}
          error={error}
          activeView={activeView}
          onChangeView={setActiveView}
          workspaceHeight={workspaceHeight}
        />
      </Flex>
    </Flex>
  );
};

export default StudioShell;

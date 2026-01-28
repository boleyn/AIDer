import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";

import TopBar from "./TopBar";
import ChatPanel from "./ChatPanel";
import WorkspaceShell from "./WorkspaceShell";
import type { SaveStatus } from "./CodeChangeListener";

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
  const [activeView, setActiveView] = useState<ActiveView>("code");
  const [projectName, setProjectName] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
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
      const nextName = (payload.name as string) || "未命名项目";

      setTemplate((nextTemplate as SandpackPredefinedTemplate) || DEFAULT_TEMPLATE);
      setFiles(nextFiles);
      setDependencies(nextDependencies as Record<string, string>);
      setProjectName(nextName);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败，请检查后端接口。 ");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    // 当initialToken变化时，更新token并加载项目（首次进入也需要加载）
    if (!initialToken) {
      return;
    }
    if (initialToken !== token) {
      setToken(initialToken);
    }
    loadProject(initialToken);
  }, [initialToken, token, loadProject]);

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

  const handleManualSave = useCallback(async () => {
    // 手动保存：只保存文件内容
    if (!token || !files) {
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch(`/api/code?token=${encodeURIComponent(token)}&action=files`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files,
          name: projectName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`保存失败: ${response.status}`);
      }

      setSaveStatus("saved");
    } catch (error) {
      console.error("Failed to save project:", error);
      setSaveStatus("error");
    }
  }, [token, files, projectName]);

  const handleDownload = useCallback(() => {
    if (!files) return;
    
    const projectData = {
      template,
      files: Object.entries(files).map(([path, file]) => ({
        path,
        code: file.code,
      })),
      dependencies,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName || "project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [files, template, dependencies, projectName]);

  const handleProjectNameChange = useCallback(async (newName: string) => {
    if (!token || !newName.trim() || newName === projectName) {
      return;
    }

    try {
      // 只传需要更新的字段
      const response = await fetch(`/api/code?token=${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`更新失败: ${response.status}`);
      }

      // 更新项目名称状态
      setProjectName(newName.trim());
      
      // 返回成功，让TopBar知道保存成功
      return true;
    } catch (error) {
      console.error("Failed to update project name:", error);
      throw error; // 抛出错误，让TopBar处理
    }
  }, [token, projectName]);

  const chromeOffset = 44;
  const workspaceHeight = topBarHeight
    ? `calc(100vh - ${topBarHeight}px - ${chromeOffset}px)`
    : "100vh";

  return (
    <Flex direction="column" h="100vh" bg="transparent" p={{ base: 3, md: 4 }} gap={3}>
      <Box ref={topBarRef}>
        <TopBar
          projectName={projectName}
          saveStatus={saveStatus}
          onSave={handleManualSave}
          onDownload={handleDownload}
          onProjectNameChange={handleProjectNameChange}
        />
      </Box>

      <Flex as="main" align="stretch" gap={4} flex="1" minH="0">
        <ChatPanel />
        <WorkspaceShell
          token={token}
          template={template}
          files={sandpackFiles}
          customSetup={customSetup}
          status={status}
          error={error}
          activeView={activeView}
          onChangeView={setActiveView}
          workspaceHeight={workspaceHeight}
          onSaveStatusChange={setSaveStatus}
        />
      </Flex>
    </Flex>
  );
};

export default StudioShell;

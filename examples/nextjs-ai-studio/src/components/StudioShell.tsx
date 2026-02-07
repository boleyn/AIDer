import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { SandpackProvider, type SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";
import dynamic from "next/dynamic";
import { githubLight } from "@codesandbox/sandpack-themes";

import TopBar from "./TopBar";
import { withAuthHeaders } from "@features/auth/client/authClient";
import VectorBackground from "./auth/VectorBackground";
const ChatPanel = dynamic(() => import("../features/chat/components/ChatPanel"), {
  ssr: false,
});
import WorkspaceShell from "./WorkspaceShell";
import type { SaveStatus } from "./CodeChangeListener";
import CodeChangeListener from "./CodeChangeListener";

type SandpackFile = { code: string };
export type SandpackFiles = Record<string, SandpackFile>;

type ProjectStatus = "idle" | "loading" | "ready" | "error";

type StudioShellProps = {
  initialToken?: string;
  initialProject?: {
    token: string;
    name: string;
    template: SandpackPredefinedTemplate;
    files: SandpackFiles;
    dependencies?: Record<string, string>;
  };
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

const StudioShell = ({ initialToken = "", initialProject }: StudioShellProps) => {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<ProjectStatus>(() => {
    if (initialProject && initialProject.token === initialToken) {
      return "ready";
    }
    return initialToken ? "loading" : "idle";
  });
  const [error, setError] = useState("");
  const [template, setTemplate] = useState<SandpackPredefinedTemplate>(
    initialProject?.template || DEFAULT_TEMPLATE
  );
  const [files, setFiles] = useState<SandpackFiles | null>(
    initialProject?.files || null
  );
  const latestFilesRef = useRef<SandpackFiles | null>(initialProject?.files || null);
  const [dependencies, setDependencies] = useState<Record<string, string>>(
    initialProject?.dependencies || {}
  );
  const [activeView, setActiveView] = useState<ActiveView>("code");
  const [projectName, setProjectName] = useState<string>(initialProject?.name || "");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const loadProject = useCallback(async (requestedToken: string) => {
    if (!requestedToken) {
      setError("需要一个项目 ID (di) 才能加载项目。你也可以用 /project/<di> 作为路径。");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const response = await fetch(`/api/code?token=${encodeURIComponent(requestedToken)}`, {
        headers: withAuthHeaders(),
      });
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
      latestFilesRef.current = nextFiles;
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
    if (initialProject && initialProject.token === initialToken) {
      if (initialToken !== token) {
        setToken(initialToken);
      }
      return;
    }
    if (initialToken !== token) {
      setToken(initialToken);
    }
    loadProject(initialToken);
  }, [initialToken, token, loadProject, initialProject]);

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
    const currentFiles = latestFilesRef.current || files;
    if (!token || !currentFiles) {
      return;
    }

    setSaveStatus("saving");

    try {
      const response = await fetch(`/api/code?token=${encodeURIComponent(token)}&action=files`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...withAuthHeaders(),
        },
        body: JSON.stringify({
          files: currentFiles,
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
    const currentFiles = latestFilesRef.current || files;
    if (!currentFiles) return;
    
    const projectData = {
      template,
      files: Object.entries(currentFiles).map(([path, file]) => ({
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

  const handleFilesChange = useCallback((nextFiles: SandpackFiles) => {
    latestFilesRef.current = nextFiles;
  }, []);

  useEffect(() => {
    const handleMove = (event: MouseEvent) => {
      if (!resizingRef.current) return;
      const containerLeft = containerRef.current?.getBoundingClientRect().left || 0;
      const next = Math.min(560, Math.max(300, event.clientX - containerLeft));
      setChatWidth(next);
    };
    const handleUp = () => {
      resizingRef.current = false;
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  const handleAgentFilesUpdated = useCallback((updated: Record<string, { code: string }>) => {
    const merged = {
      ...(latestFilesRef.current || files || {}),
      ...updated,
    };
    latestFilesRef.current = merged;
    setFiles(merged);
  }, [files]);

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
          ...withAuthHeaders(),
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const [workspaceHeight, setWorkspaceHeight] = useState("100%");
  const [chatWidth, setChatWidth] = useState(420);
  const resizingRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    const main = mainRef.current;
    if (!container || !main) {
      return;
    }

    const updateHeight = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const mainTop = main.getBoundingClientRect().top;
      const containerStyles = getComputedStyle(container);
      const paddingBottom = parseFloat(containerStyles.paddingBottom || "0") || 0;
      const borderBottom = parseFloat(containerStyles.borderBottomWidth || "0") || 0;
      const nextHeight = Math.max(0, viewportHeight - mainTop - paddingBottom - borderBottom);
      setWorkspaceHeight(`${nextHeight}px`);
    };

    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(container);
    observer.observe(main);
    window.addEventListener("resize", updateHeight);
    window.visualViewport?.addEventListener("resize", updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
      window.visualViewport?.removeEventListener("resize", updateHeight);
    };
  }, []);

  return (
    <Box position="relative" minH="100vh" overflow="hidden">
      <VectorBackground />
      <Flex
        ref={containerRef}
        direction="column"
        minH="100vh"
        align="stretch"
        justify="flex-start"
        px={{ base: 4, md: 8, xl: 10 }}
        py={{ base: 6, md: 8 }}
        position="relative"
        zIndex={1}
        gap={{ base: 4, md: 5 }}
        overflow="hidden"
        boxSizing="border-box"
      >
        <Box>
          <TopBar
            projectName={projectName}
            saveStatus={saveStatus}
            onSave={handleManualSave}
            onDownload={handleDownload}
            onProjectNameChange={handleProjectNameChange}
          />
        </Box>

        <SandpackProvider
          template={template}
          files={sandpackFiles}
          customSetup={customSetup}
          theme={githubLight}
          options={{
            autorun: true,
          }}
        >
          <CodeChangeListener
            token={token}
            template={template}
            dependencies={customSetup?.dependencies || {}}
            onSaveStatusChange={setSaveStatus}
            onFilesChange={handleFilesChange}
          />
          <Flex ref={mainRef} as="main" align="stretch" gap={0} flex="1" minH="0">
            <Box
              flex="0 0 auto"
              minW="300px"
              maxW="560px"
              w={`${chatWidth}px`}
              alignSelf="stretch"
            >
              <ChatPanel
                token={token}
                onFilesUpdated={handleAgentFilesUpdated}
                height={workspaceHeight}
              />
            </Box>
            <Box
              w="10px"
              cursor="col-resize"
              bg="transparent"
              position="relative"
              _before={{
                content: '""',
                position: "absolute",
                left: "50%",
                top: "20%",
                transform: "translateX(-50%)",
                width: "2px",
                height: "60%",
                borderRadius: "999px",
                background: "rgba(148,163,184,0.35)",
              }}
              _hover={{
                bg: "rgba(148,163,184,0.12)",
                _before: { background: "rgba(71,85,105,0.5)" },
              }}
              onMouseDown={() => {
                resizingRef.current = true;
              }}
            />
            <WorkspaceShell
              status={status}
              error={error}
              activeView={activeView}
              onChangeView={setActiveView}
              workspaceHeight={workspaceHeight}
            />
          </Flex>
        </SandpackProvider>
      </Flex>
    </Box>
  );
};

export default StudioShell;

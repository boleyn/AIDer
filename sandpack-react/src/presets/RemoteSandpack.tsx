import React from "react";

import { SandpackCodeEditor } from "../components/CodeEditor";
import { SandpackFileExplorer } from "../components/FileExplorer";
import { SandpackPreview } from "../components/Preview";
import { SandpackLayout } from "../components/common/Layout";
import { SandpackProvider } from "../contexts/sandpackContext";
import type {
  SandpackFiles,
  SandpackOptions,
  SandpackPredefinedTemplate,
  SandpackSetup,
} from "../types";

const DEFAULT_IGNORED_PATHS = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  ".next",
  ".git",
  ".turbo",
  ".cache",
];

const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_FILE_SIZE = 500_000;

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".mp3",
  ".mp4",
  ".wav",
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".pdf",
  ".ico",
  ".woff",
  ".woff2",
]);

const pickActiveFile = (files: SandpackFiles): string => {
  const candidates = [
    "/src/main.tsx",
    "/src/main.jsx",
    "/src/index.tsx",
    "/src/index.jsx",
    "/App.tsx",
    "/App.jsx",
    "/index.ts",
    "/index.js",
  ];

  for (const candidate of candidates) {
    if (files[candidate]) return candidate;
  }

  const firstFile = Object.keys(files)[0];
  return firstFile ?? "/App.jsx";
};

interface GitHubTarget {
  owner: string;
  repo: string;
  branch?: string;
  subdir?: string;
}

export interface RemoteSandpackProps {
  githubUrl?: string;
  defaultTemplate?: SandpackPredefinedTemplate;
  customSetup?: SandpackSetup;
  options?: SandpackOptions;
  maxFiles?: number;
  maxFileSize?: number;
  ignorePaths?: string[];
  showControls?: boolean;
  showEditorByDefault?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const withProtocol = (value: string): string =>
  value.startsWith("http://") || value.startsWith("https://")
    ? value
    : `https://${value}`;

const parseGitHubUrl = (value: string): GitHubTarget | null => {
  try {
    const url = new URL(withProtocol(value));
    if (url.hostname !== "github.com") return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0];
    const repo = parts[1].replace(/\.git$/, "");

    if (parts[2] === "tree" || parts[2] === "blob") {
      const branch = parts[3];
      const subdir = parts.slice(4).join("/");
      return { owner, repo, branch, subdir: subdir || undefined };
    }

    const subdir = parts.slice(2).join("/");
    return { owner, repo, subdir: subdir || undefined };
  } catch {
    return null;
  }
};

const createHeaders = (token?: string): HeadersInit =>
  token ? { Authorization: `Bearer ${token}` } : {};

const fetchJson = async <T,>(
  url: string,
  signal: AbortSignal,
  headers?: HeadersInit
): Promise<T> => {
  const response = await fetch(url, { signal, headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
};

const fetchText = async (
  url: string,
  signal: AbortSignal,
  headers?: HeadersInit
): Promise<string> => {
  const response = await fetch(url, { signal, headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

const shouldIgnorePath = (path: string, ignorePaths: string[]): boolean =>
  ignorePaths.some((segment) => path.split("/").includes(segment));

const hasBinaryExtension = (path: string): boolean => {
  const lastDot = path.lastIndexOf(".");
  if (lastDot === -1) return false;
  return BINARY_EXTENSIONS.has(path.slice(lastDot).toLowerCase());
};

const inferTemplate = (
  files: SandpackFiles,
  fallback: SandpackPredefinedTemplate
): SandpackPredefinedTemplate => {
  const packagePath = Object.keys(files).find(
    (path) => path.toLowerCase() === "/package.json"
  );
  const packageContent = packagePath ? files[packagePath] : undefined;
  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } | null =
    null;

  if (typeof packageContent === "string") {
    try {
      pkg = JSON.parse(packageContent);
    } catch {
      pkg = null;
    }
  }

  const dependencies = { ...pkg?.dependencies, ...pkg?.devDependencies };
  const fileList = Object.keys(files);
  const usesTypeScript =
    fileList.some((path) => path.endsWith(".ts") || path.endsWith(".tsx")) ||
    fileList.some((path) => path.endsWith("tsconfig.json"));

  const hasDep = (name: string): boolean => Boolean(dependencies?.[name]);

  if (hasDep("next")) return "nextjs";
  if (hasDep("astro")) return "astro";
  if (hasDep("@angular/core")) return "angular";
  if (hasDep("vite")) {
    if (hasDep("preact")) return usesTypeScript ? "vite-preact-ts" : "vite-preact";
    if (hasDep("vue")) return usesTypeScript ? "vite-vue-ts" : "vite-vue";
    if (hasDep("svelte")) return usesTypeScript ? "vite-svelte-ts" : "vite-svelte";
    if (hasDep("react")) return usesTypeScript ? "vite-react-ts" : "vite-react";
    return "vite";
  }
  if (hasDep("react")) return usesTypeScript ? "react-ts" : "react";
  if (hasDep("svelte")) return "svelte";
  if (hasDep("vue")) return usesTypeScript ? "vue-ts" : "vue";
  if (hasDep("solid-js")) return "solid";

  return usesTypeScript ? "vanilla-ts" : fallback;
};

const loadGithubFiles = async (
  target: GitHubTarget,
  signal: AbortSignal,
  headers: HeadersInit,
  maxFiles: number,
  maxFileSize: number,
  ignorePaths: string[]
): Promise<SandpackFiles> => {
  const repoInfo = target.branch
    ? { default_branch: target.branch }
    : await fetchJson<{ default_branch: string }>(
        `https://api.github.com/repos/${target.owner}/${target.repo}`,
        signal,
        headers
      );

  const branch = target.branch ?? repoInfo.default_branch;

  const tree = await fetchJson<{
    tree: Array<{ path: string; type: string; size?: number }>;
  }>(
    `https://api.github.com/repos/${target.owner}/${target.repo}/git/trees/${branch}?recursive=1`,
    signal,
    headers
  );

  const prefix = target.subdir ? `${target.subdir.replace(/\/$/, "")}/` : "";

  const fileEntries = tree.tree
    .filter((entry) => entry.type === "blob")
    .filter((entry) => entry.path.startsWith(prefix))
    .map((entry) => ({
      path: entry.path.slice(prefix.length),
      size: entry.size ?? 0,
    }))
    .filter((entry) => entry.path.length > 0)
    .filter((entry) => !shouldIgnorePath(entry.path, ignorePaths))
    .filter((entry) => !hasBinaryExtension(entry.path))
    .filter((entry) => entry.size <= maxFileSize)
    .slice(0, maxFiles);

  const files: SandpackFiles = {};
  const baseUrl = `https://raw.githubusercontent.com/${target.owner}/${target.repo}/${branch}/`;

  const concurrency = 10;
  let index = 0;

  const runNext = async (): Promise<void> => {
    const current = index++;
    if (current >= fileEntries.length) return;

    const entry = fileEntries[current];
    const rawUrl = `${baseUrl}${prefix}${entry.path}`;
    const code = await fetchText(rawUrl, signal, headers);
    files[`/${entry.path}`] = code;

    await runNext();
  };

  const runners = Array.from({ length: concurrency }, () => runNext());
  await Promise.all(runners);

  return files;
};

export const RemoteSandpack: React.FC<RemoteSandpackProps> = ({
  githubUrl,
  defaultTemplate = "vite-react",
  customSetup,
  options,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  ignorePaths = DEFAULT_IGNORED_PATHS,
  showControls = true,
  showEditorByDefault = false,
  className,
  style,
}) => {
  const [inputUrl, setInputUrl] = React.useState(githubUrl ?? "");
  const [resolvedUrl, setResolvedUrl] = React.useState(githubUrl ?? "");
  const [status, setStatus] = React.useState<
    "idle" | "loading" | "ready" | "error"
  >(resolvedUrl ? "loading" : "idle");
  const [files, setFiles] = React.useState<SandpackFiles | null>(null);
  const [template, setTemplate] = React.useState<SandpackPredefinedTemplate>(
    defaultTemplate
  );
  const [error, setError] = React.useState<string | null>(null);
  const [showEditor, setShowEditor] = React.useState(showEditorByDefault);

  React.useEffect(() => {
    if (!resolvedUrl) {
      setStatus("idle");
      setFiles(null);
      setError(null);
      return;
    }

    const target = parseGitHubUrl(resolvedUrl);
    if (!target) {
      setStatus("error");
      setError("Invalid GitHub URL.");
      return;
    }

    const controller = new AbortController();
    const headers = createHeaders();
    setStatus("loading");
    setError(null);

    loadGithubFiles(
      target,
      controller.signal,
      headers,
      maxFiles,
      maxFileSize,
      ignorePaths
    )
      .then((loadedFiles) => {
        setFiles(loadedFiles);
        setTemplate(inferTemplate(loadedFiles, defaultTemplate));
        setStatus("ready");
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      });

    return () => controller.abort();
  }, [resolvedUrl, defaultTemplate, maxFiles, maxFileSize, ignorePaths]);

  const { activeFile: _ignoredActiveFile, visibleFiles: _ignoredVisibleFiles, ...restOptions } =
    options ?? {};

  return (
    <div
      className={className}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {showControls && (
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #e1e1e1",
            display: "flex",
            gap: 8,
            alignItems: "center",
            background: "#f8f8f8",
          }}
        >
          <input
            onChange={(event) => setInputUrl(event.target.value)}
            placeholder="https://github.com/user/repo or https://github.com/user/repo/tree/branch/path"
            style={{
              flex: 1,
              padding: "8px 10px",
              borderRadius: 6,
              border: "1px solid #ccc",
              fontSize: 14,
            }}
            value={inputUrl}
          />
          <button
            onClick={() => setResolvedUrl(inputUrl.trim())}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid #333",
              background: "#111",
              color: "#fff",
              cursor: "pointer",
            }}
            type="button"
          >
            Load
          </button>
          <span style={{ fontSize: 12, color: "#666" }}>
            {status === "loading" && "Loading..."}
            {status === "ready" && "Loaded"}
            {status === "error" && "Failed"}
          </span>
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            padding: "8px 16px",
            color: "#b00020",
            background: "#fff1f1",
            borderBottom: "1px solid #f2b8b8",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {status === "ready" && files ? (
        <SandpackProvider
          customSetup={customSetup}
          files={files}
          options={{
            ...restOptions,
            activeFile: _ignoredActiveFile ?? pickActiveFile(files),
            visibleFiles: [_ignoredActiveFile ?? pickActiveFile(files)],
          }}
          template={template}
        >
          <SandpackLayout style={{ "--sp-layout-height": "100%" } as React.CSSProperties}>
            <div
              onClick={() => setShowEditor(true)}
              role="presentation"
              style={{ height: "100%" }}
            >
              <SandpackFileExplorer />
            </div>
            {showEditor ? (
              <SandpackCodeEditor closableTabs showLineNumbers />
            ) : (
              <div
                style={{
                  minWidth: 240,
                  borderRight: "1px solid #e1e1e1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#666",
                  fontSize: 13,
                }}
              >
                Click a file to open editor
              </div>
            )}
            <SandpackPreview showNavigator />
          </SandpackLayout>
        </SandpackProvider>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#666",
            fontSize: 14,
          }}
        >
          {status === "loading"
            ? "Loading repository..."
            : "Enter a GitHub URL to load a project"}
        </div>
      )}
    </div>
  );
};

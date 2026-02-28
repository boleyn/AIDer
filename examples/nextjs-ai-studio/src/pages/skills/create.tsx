import { Badge, Box, Button, Flex, Input, Spinner, Text, Textarea } from "@chakra-ui/react";
import { withAuthHeaders } from "@features/auth/client/authClient";
import ChatPanel from "@features/chat/components/ChatPanel";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { getAuthUserFromRequest } from "@server/auth/ssr";
import Markdown from "@/components/Markdown";
import VectorBackground from "@/components/auth/VectorBackground";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";

type FileMap = Record<string, { code: string }>;
type FileTreeNode = {
  name: string;
  path: string;
  type: "dir" | "file";
  children?: FileTreeNode[];
};

const buildFileTree = (paths: string[]): FileTreeNode[] => {
  type BuildNode = {
    name: string;
    path: string;
    type: "dir" | "file";
    children: Map<string, BuildNode>;
  };
  const root = new Map<string, BuildNode>();

  for (const filePath of paths) {
    const segments = filePath.split("/").filter(Boolean);
    if (segments.length === 0) continue;

    let current = root;
    let currentPath = "";
    for (let i = 0; i < segments.length; i += 1) {
      const name = segments[i];
      currentPath = `${currentPath}/${name}`;
      const isFile = i === segments.length - 1;
      const existing = current.get(name);
      if (!existing) {
        const nextNode: BuildNode = {
          name,
          path: currentPath,
          type: isFile ? "file" : "dir",
          children: new Map<string, BuildNode>(),
        };
        current.set(name, nextNode);
      }
      const target = current.get(name);
      if (!target) break;
      current = target.children;
    }
  }

  const toOutputNodes = (nodeMap: Map<string, BuildNode>): FileTreeNode[] =>
    [...nodeMap.values()]
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((node) =>
        node.type === "dir"
          ? {
              ...node,
              children: toOutputNodes(node.children),
            }
          : { name: node.name, path: node.path, type: "file" }
      );

  return toOutputNodes(root);
};

const getAncestorDirs = (filePath: string): string[] => {
  const segments = filePath.split("/").filter(Boolean);
  const dirs: string[] = [];
  let current = "";
  for (let i = 0; i < segments.length - 1; i += 1) {
    current = `${current}/${segments[i]}`;
    dirs.push(current);
  }
  return dirs;
};

const SkillCreatePage = () => {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [bootstrapError, setBootstrapError] = useState("");
  const [activeView, setActiveView] = useState<"preview" | "code">("code");
  const [files, setFiles] = useState<FileMap>({});
  const [selectedFile, setSelectedFile] = useState("");
  const [fileQuery, setFileQuery] = useState("");
  const [draftCode, setDraftCode] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set(["/skills"]));

  useEffect(() => {
    if (!router.isReady) return;
    let cancelled = false;
    const bootstrap = async () => {
      setIsBootstrapping(true);
      setBootstrapError("");
      try {
        if (typeof router.query.conversation === "string" && router.query.conversation) {
          const nextQuery = { ...router.query };
          delete nextQuery.conversation;
          void router.replace(
            {
              pathname: router.pathname,
              query: nextQuery,
            },
            undefined,
            { shallow: true }
          );
        }
        const projectToken =
          typeof router.query.projectToken === "string" ? router.query.projectToken.trim() : "";
        if (!projectToken) {
          throw new Error("缺少 projectToken，无法绑定项目");
        }
        const res = await fetch("/api/skills/workspaces/create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...withAuthHeaders(),
          },
          body: JSON.stringify({ projectToken }),
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof payload?.error === "string" ? payload.error : "创建 workspace 失败");
        }
        if (cancelled) return;
        const id = typeof payload.workspaceId === "string" ? payload.workspaceId : "";
        const nextFiles = payload.files && typeof payload.files === "object" ? (payload.files as FileMap) : {};
        setWorkspaceId(id);
        setFiles(nextFiles);
        const firstFile = Object.keys(nextFiles).sort((a, b) => a.localeCompare(b))[0] || "";
        setSelectedFile(firstFile);
      } catch (error) {
        if (cancelled) return;
        setBootstrapError(error instanceof Error ? error.message : "初始化失败");
      } finally {
        if (!cancelled) setIsBootstrapping(false);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fileList = useMemo(() => Object.keys(files).sort((a, b) => a.localeCompare(b)), [files]);
  const filteredFiles = useMemo(() => {
    const keyword = fileQuery.trim().toLowerCase();
    if (!keyword) return fileList;
    return fileList.filter((path) => path.toLowerCase().includes(keyword));
  }, [fileList, fileQuery]);
  const fileTree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);
  const activeFile = selectedFile && files[selectedFile] ? selectedFile : filteredFiles[0] || fileList[0] || "";
  const selectedCode = activeFile ? files[activeFile]?.code || "" : "";
  const isMarkdownFile = /\.md$/i.test(activeFile);
  const workspaceStatus: "idle" | "loading" | "ready" | "error" = isBootstrapping
    ? "loading"
    : bootstrapError
    ? "error"
    : workspaceId
    ? "ready"
    : "idle";

  useEffect(() => {
    if (!selectedFile && fileList.length > 0) {
      setSelectedFile(fileList[0]);
      return;
    }
    if (selectedFile && !files[selectedFile]) {
      setSelectedFile(fileList[0] || "");
    }
  }, [fileList, files, selectedFile]);

  useEffect(() => {
    setDraftCode(selectedCode);
    setIsDirty(false);
    setSaveError("");
    setSaveSuccess("");
  }, [activeFile, selectedCode]);

  useEffect(() => {
    if (!activeFile) return;
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      for (const dir of getAncestorDirs(activeFile)) {
        next.add(dir);
      }
      return next;
    });
  }, [activeFile]);

  const handleSelectFile = (filePath: string) => {
    if (filePath === activeFile) return;
    if (isDirty && typeof window !== "undefined") {
      const ok = window.confirm("当前文件有未保存修改，是否放弃修改并切换文件？");
      if (!ok) return;
    }
    setSelectedFile(filePath);
  };

  const handleSaveFile = async () => {
    if (!workspaceId || !activeFile || isSaving) return;
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await fetch(`/api/skills/workspaces/${encodeURIComponent(workspaceId)}/files`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...withAuthHeaders(),
        },
        body: JSON.stringify({
          projectToken: typeof router.query.projectToken === "string" ? router.query.projectToken : "",
          path: activeFile,
          content: draftCode,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof payload?.error === "string" ? payload.error : "保存失败");
      }
      const nextFiles =
        payload.files && typeof payload.files === "object" ? (payload.files as FileMap) : null;
      if (nextFiles) {
        setFiles(nextFiles);
      } else {
        setFiles((prev) => ({
          ...prev,
          [activeFile]: { code: draftCode },
        }));
      }
      setIsDirty(false);
      setSaveSuccess("已保存到 skills 文件");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDir = (dirPath: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) {
        next.delete(dirPath);
      } else {
        next.add(dirPath);
      }
      return next;
    });
  };

  return (
    <Box position="relative" minH="100vh" overflow="hidden">
      <VectorBackground />
      <Flex
        direction="column"
        minH="100vh"
        align="stretch"
        justify="flex-start"
        px={{ base: 4, md: 8, xl: 10 }}
        py={{ base: 6, md: 8 }}
        position="relative"
        zIndex={1}
        gap={0}
        overflow="hidden"
        boxSizing="border-box"
      >
        <Flex
          align="center"
          justify="space-between"
          px={3}
          py={2}
          mb={2}
          border="1px solid"
          borderColor="rgba(203,213,225,0.75)"
          borderRadius="xl"
          bg="rgba(255,255,255,0.75)"
          backdropFilter="blur(12px)"
        >
          <Box>
            <Text color="myGray.800" fontSize="lg" fontWeight="800" lineHeight="1.1">
              Skills 创建工作台
            </Text>
            <Text color="myGray.600" fontSize="sm" mt={0.5}>
              左侧对话生成或修改技能，右侧实时编辑并保存 `/skills/*` 文件
            </Text>
          </Box>
          <Badge
            colorScheme="blue"
            variant="subtle"
            borderRadius="full"
            px={3}
            py={1}
            fontSize="11px"
            fontWeight="700"
          >
            Skill Studio
          </Badge>
        </Flex>
        <Flex as="main" align="stretch" gap={0} flex="1" minH="0">
          <Box flex="0 0 auto" minW="300px" maxW="728px" w="546px" alignSelf="stretch" minH={0}>
            {isBootstrapping ? (
              <Flex
                h="100%"
                align="center"
                justify="center"
                border="1px solid"
                borderColor="rgba(203,213,225,0.85)"
                borderBottomLeftRadius="xl"
                borderTopLeftRadius="xl"
                backdropFilter="blur(10px)"
                bg="rgba(255,255,255,0.9)"
              >
                <Flex align="center" color="myGray.500" gap={2}>
                  <Spinner size="sm" />
                  <Text fontSize="sm">初始化 skill workspace...</Text>
                </Flex>
              </Flex>
            ) : (
              <ChatPanel
                key={workspaceId}
                token={`skill-studio:${workspaceId}`}
                height="100%"
                completionsPath="/api/skills/chat/completions"
                completionsStream
                completionsExtraBody={{
                  workspaceId,
                  projectToken:
                    typeof router.query.projectToken === "string"
                      ? router.query.projectToken
                      : "",
                }}
                hideSkillsManager
                autoCreateInitialConversation={false}
                defaultHeaderTitle="Skills Copilot"
                emptyStateTitle="从一个技能想法开始"
                emptyStateDescription="例如：帮我创建一个读取 GitLab 文档并输出知识库摘要的技能。"
                onFilesUpdated={(nextFiles) => setFiles(nextFiles)}
              />
            )}
          </Box>
          <Box
            w="10px"
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
          />
          <Flex
            as="section"
            direction="column"
            flex="1"
            minH="0"
            border="1px solid rgba(255,255,255,0.75)"
            borderTopLeftRadius={0}
            borderBottomLeftRadius={0}
            borderTopRightRadius="2xl"
            borderBottomRightRadius="2xl"
            bg="rgba(255,255,255,0.75)"
            backdropFilter="blur(22px)"
            boxShadow="0 24px 42px -28px rgba(15, 23, 42, 0.35)"
            overflow="hidden"
          >
            <WorkspaceHeader
              activeView={activeView}
              onChangeView={setActiveView}
              status={workspaceStatus}
              error={bootstrapError}
            />
            <Flex
              position="relative"
              flex="1"
              minH="0"
              overflow="hidden"
              bg="rgba(248,250,252,0.65)"
              display="flex"
            >
              <Box
                borderRight="1px solid"
                borderColor="rgba(226,232,240,0.9)"
                p={2}
                w="34%"
                minW="220px"
                minH={0}
                h="100%"
              >
                <Flex direction="column" h="100%" minH={0}>
                  <Input
                    mb={2}
                    placeholder="筛选文件"
                    size="sm"
                    value={fileQuery}
                    onChange={(event) => setFileQuery(event.target.value)}
                  />
                  <Box flex="1" minH={0} overflowY="auto">
                    <Flex direction="column" gap={0.5}>
                      {fileTree.length === 0 ? (
                        <Text color="myGray.500" fontSize="sm" px={2} py={1}>
                          无匹配文件
                        </Text>
                      ) : (
                        fileTree.map((node) => {
                          const renderNode = (treeNode: FileTreeNode, depth: number) => {
                            if (treeNode.type === "dir") {
                              const isOpen = expandedDirs.has(treeNode.path);
                              return (
                                <Box key={treeNode.path}>
                                  <Button
                                    justifyContent="flex-start"
                                    onClick={() => toggleDir(treeNode.path)}
                                    size="sm"
                                    variant="ghost"
                                    w="full"
                                    pl={`${8 + depth * 14}px`}
                                  >
                                    <Text as="span" fontFamily="mono" fontSize="12px" mr={2}>
                                      {isOpen ? "▾" : "▸"}
                                    </Text>
                                    <Text as="span" isTruncated>
                                      {treeNode.name}
                                    </Text>
                                  </Button>
                                  {isOpen
                                    ? (treeNode.children || []).map((child) => renderNode(child, depth + 1))
                                    : null}
                                </Box>
                              );
                            }
                            return (
                              <Button
                                key={treeNode.path}
                                justifyContent="flex-start"
                                onClick={() => handleSelectFile(treeNode.path)}
                                size="sm"
                                variant={activeFile === treeNode.path ? "solid" : "ghost"}
                                w="full"
                                pl={`${24 + depth * 14}px`}
                              >
                                <Text as="span" fontFamily="mono" fontSize="12px" mr={2}>
                                  ·
                                </Text>
                                <Text as="span" isTruncated>
                                  {treeNode.name}
                                </Text>
                              </Button>
                            );
                          };
                          return renderNode(node, 0);
                        })
                      )}
                    </Flex>
                  </Box>
                </Flex>
              </Box>

              <Box flex="1" minH={0} h="100%" overflowY="auto" p={3}>
                {activeView === "code" ? (
                  <Box bg="white" border="1px solid" borderColor="myGray.200" borderRadius="10px" minH="100%" p={3}>
                    <Flex align="center" justify="space-between" mb={2}>
                      <Text color="myGray.700" fontSize="xs" fontWeight="700">
                        {activeFile || "请选择文件"}
                      </Text>
                      <Flex align="center" gap={2}>
                        {isDirty ? (
                          <Badge
                            borderRadius="full"
                            colorScheme="orange"
                            variant="subtle"
                            px={2}
                            py={0.5}
                            fontSize="11px"
                            fontWeight="700"
                          >
                            未保存
                          </Badge>
                        ) : null}
                        {!isDirty && saveSuccess ? (
                          <Badge
                            borderRadius="full"
                            colorScheme="green"
                            variant="subtle"
                            px={2}
                            py={0.5}
                            fontSize="11px"
                            fontWeight="700"
                          >
                            {saveSuccess}
                          </Badge>
                        ) : null}
                        {saveError ? (
                          <Text color="red.500" fontSize="xs" fontWeight="600">
                            {saveError}
                          </Text>
                        ) : null}
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => {
                            void handleSaveFile();
                          }}
                          isDisabled={!activeFile || !isDirty}
                          isLoading={isSaving}
                        >
                          保存
                        </Button>
                      </Flex>
                    </Flex>
                    <Textarea
                      fontFamily="mono"
                      fontSize="12px"
                      minH="calc(100vh - 260px)"
                      value={draftCode}
                      onChange={(event) => {
                        const next = event.target.value;
                        setDraftCode(next);
                        setIsDirty(next !== selectedCode);
                        setSaveError("");
                        setSaveSuccess("");
                      }}
                      placeholder={activeFile ? "编辑文件内容..." : "请选择文件"}
                      isDisabled={!activeFile}
                      resize="vertical"
                    />
                  </Box>
                ) : (
                  <Box bg="white" border="1px solid" borderColor="myGray.200" borderRadius="10px" minH="100%" p={3}>
                    <Text color="myGray.700" fontSize="xs" fontWeight="700" mb={2}>
                      {activeFile || "请选择文件"}
                    </Text>
                    {!(isDirty ? draftCode : selectedCode) ? (
                      <Text color="myGray.500" fontSize="sm">
                        (empty)
                      </Text>
                    ) : isMarkdownFile ? (
                      <Markdown source={isDirty ? draftCode : selectedCode} />
                    ) : (
                      <Text fontFamily="mono" fontSize="12px" whiteSpace="pre-wrap">
                        {isDirty ? draftCode : selectedCode}
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const authUser = getAuthUserFromRequest(context.req);
  if (!authUser) {
    return {
      redirect: {
        destination: `/login?lastRoute=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }
  return { props: {} };
};

export default SkillCreatePage;

import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackPreview,
  SandpackStack,
} from "@codesandbox/sandpack-react";
import { Box, Flex } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

import FileExplorerPanel from "./workspace/FileExplorerPanel";
import WorkspaceHeader from "./workspace/WorkspaceHeader";

type ActiveView = "preview" | "code";

type WorkspaceShellProps = {
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  workspaceHeight: string;
};

const WorkspaceShell = ({
  status,
  error,
  activeView,
  onChangeView,
  workspaceHeight,
}: WorkspaceShellProps) => {
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      return;
    }
    const updateHeight = () => {
      setHeaderHeight(header.getBoundingClientRect().height);
    };
    updateHeight();
    const observer = new ResizeObserver(() => updateHeight());
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const baseHeight = Number.parseFloat(workspaceHeight);
  const contentHeight =
    Number.isFinite(baseHeight) && baseHeight > 0
      ? `${Math.max(0, baseHeight - headerHeight)}px`
      : "100%";

  return (
    <Flex
      as="section"
      direction="column"
      flex="1"
      minH="0"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="xl"
      bg="whiteAlpha.900"
      boxShadow="sm"
      overflow="hidden"
    >
      <Flex direction="column" flex="1" minH="0" h="100%">
        <Box ref={headerRef}>
          <WorkspaceHeader
            activeView={activeView}
            onChangeView={onChangeView}
            status={status}
            error={error}
          />
        </Box>
        <Box
          position="relative"
          flex="1"
          minH="0"
          display="flex"
          height={contentHeight}
          minHeight={contentHeight}
        >
          <SandpackLayout
            style={{
              width: "100%",
              height: "100%",
              minHeight: 0,
              display: activeView === "code" ? "flex" : "none",
            }}
          >
            <FileExplorerPanel />
            <Box style={{ flex: 1, minWidth: 0, position: "relative" }}>
              <SandpackStack
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  width: "100%",
                  height: "100%",
                }}
              >
                <SandpackCodeEditor
                  showTabs
                  showLineNumbers
                  wrapContent
                  style={{ flex: 1, minHeight: 0 }}
                />
                <SandpackConsole style={{ maxHeight: "35%", overflow: "auto" }} />
              </SandpackStack>
            </Box>
          </SandpackLayout>
          <Box
            style={{
              flex: 1,
              minWidth: 0,
              position: "relative",
              display: activeView === "preview" ? "flex" : "none",
            }}
          >
            <SandpackStack
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                minHeight: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <SandpackPreview style={{ width: "100%", height: "100%" }} />
            </SandpackStack>
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
};

export default WorkspaceShell;

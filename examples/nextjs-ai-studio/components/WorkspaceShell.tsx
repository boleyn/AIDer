import {
  SandpackCodeEditor,
  SandpackConsole,
  SandpackLayout,
  SandpackPreview,
  SandpackProvider,
  SandpackStack,
  type SandpackPredefinedTemplate,
} from "@codesandbox/sandpack-react";
import { githubLight } from "@codesandbox/sandpack-themes";
import { Box, Flex } from "@chakra-ui/react";

import type { SandpackFiles } from "./StudioShell";
import FileExplorerPanel from "./workspace/FileExplorerPanel";
import WorkspaceHeader from "./workspace/WorkspaceHeader";
import CodeChangeListener, { type SaveStatus } from "./CodeChangeListener";

type ActiveView = "preview" | "code";

type WorkspaceShellProps = {
  token: string;
  template: SandpackPredefinedTemplate;
  files: SandpackFiles;
  customSetup?: { dependencies: Record<string, string> };
  status: "idle" | "loading" | "ready" | "error";
  error: string;
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
  workspaceHeight: string;
  onSaveStatusChange?: (status: SaveStatus) => void;
};

const WorkspaceShell = ({
  token,
  template,
  files,
  customSetup,
  status,
  error,
  activeView,
  onChangeView,
  workspaceHeight,
  onSaveStatusChange,
}: WorkspaceShellProps) => {

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
      <SandpackProvider
        template={template}
        files={files}
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
          onSaveStatusChange={onSaveStatusChange}
        />
        <Flex direction="column" flex="1" minH="0" h="100%">
          <WorkspaceHeader
            activeView={activeView}
            onChangeView={onChangeView}
            status={status}
            error={error}
          />
          <Box
            position="relative"
            flex="1"
            minH="0"
            display="flex"
            height={workspaceHeight}
            minHeight={workspaceHeight}
          >
            <SandpackLayout
              style={{
                width: "100%",
                height: workspaceHeight,
                minHeight: workspaceHeight,
                display: activeView === "code" ? "flex" : "none",
              }}
            >
              <FileExplorerPanel />
              <Box style={{ flex: 1, minWidth: 0, position: "relative" }}>
                <SandpackStack
                  style={{
                    position: "absolute",
                    display: "flex",
                  }}
                >
                  <SandpackCodeEditor showTabs showLineNumbers wrapContent style={{ height: workspaceHeight }} />
                  <SandpackConsole />
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
                  display: "flex",
                }}
              >
                <SandpackPreview style={{ height: workspaceHeight }} />
              </SandpackStack>
            </Box>
          </Box>
        </Flex>
      </SandpackProvider>
    </Flex>
  );
};

export default WorkspaceShell;

import { Badge, Flex, Text } from "@chakra-ui/react";

import WorkspaceActions from "./WorkspaceActions";

type WorkspaceHeaderProps = {
  activeView: "preview" | "code";
  onChangeView: (view: "preview" | "code") => void;
  status: "idle" | "loading" | "ready" | "error";
  error: string;
};

const viewButtonStyle = (active: boolean) => ({
  border: "1px solid",
  borderColor: active ? "#c7d2fe" : "#e5e7eb",
  background: active ? "#eef2ff" : "#ffffff",
  color: active ? "#2563eb" : "#111827",
  borderRadius: "999px",
  padding: "6px 12px",
  fontSize: "12px",
});

const WorkspaceHeader = ({ activeView, onChangeView, status, error }: WorkspaceHeaderProps) => {
  return (
    <Flex
      align="center"
      gap={2}
      wrap="wrap"
      borderBottom="1px solid"
      borderColor="gray.200"
      px={4}
      py={2}
      bg="gray.50"
      flexShrink={0}
    >
      <Flex gap={2} align="center">
        <button
          style={viewButtonStyle(activeView === "preview")}
          type="button"
          onClick={() => onChangeView("preview")}
        >
          Preview
        </button>
        <button
          style={viewButtonStyle(activeView === "code")}
          type="button"
          onClick={() => onChangeView("code")}
        >
          Code
        </button>
      </Flex>
      <Flex align="center" gap={2} flexWrap="wrap" marginLeft="auto">
        <Badge colorScheme="gray" variant="subtle">
          {status === "idle" && "等待输入"}
          {status === "loading" && "正在加载"}
          {status === "ready" && "已就绪"}
          {status === "error" && "加载失败"}
        </Badge>
        {error ? (
          <Text fontSize="xs" color="red.500">
            {error}
          </Text>
        ) : null}
      </Flex>
      <WorkspaceActions />
    </Flex>
  );
};

export default WorkspaceHeader;

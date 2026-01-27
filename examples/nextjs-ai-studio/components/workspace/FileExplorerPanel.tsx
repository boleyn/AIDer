import { Flex, IconButton, Text } from "@chakra-ui/react";
import { SandpackFileExplorer } from "@codesandbox/sandpack-react";

const FileExplorerPanel = () => {
  return (
    <Flex direction="column" minW="220px" maxW="260px" borderRight="1px solid" borderColor="gray.200">
      <Flex align="center" justify="space-between" px={3} py={2} bg="white" borderBottom="1px solid" borderColor="gray.200">
        <Text fontSize="xs" fontWeight="600" color="gray.600" textTransform="uppercase" letterSpacing="0.08em">
          Files
        </Text>
        <Flex gap={1}>
          <IconButton
            aria-label="Search files"
            size="xs"
            variant="ghost"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            }
          />
          <IconButton
            aria-label="New file"
            size="xs"
            variant="ghost"
            icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            }
          />
        </Flex>
      </Flex>
      <SandpackFileExplorer style={{ flex: 1, minWidth: 0, height: "100%" }} />
    </Flex>
  );
};

export default FileExplorerPanel;

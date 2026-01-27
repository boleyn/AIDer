import { Flex, IconButton, Tooltip } from "@chakra-ui/react";

const WorkspaceActions = () => {
  return (
    <Flex gap={1} align="center">
      <Tooltip label="Run">
        <IconButton
          aria-label="Run"
          size="sm"
          variant="ghost"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M7 5l12 7-12 7V5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          }
        />
      </Tooltip>
      <Tooltip label="Download">
        <IconButton
          aria-label="Download"
          size="sm"
          variant="ghost"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 4v10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M8 10l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <path d="M5 20h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          }
        />
      </Tooltip>
      <Tooltip label="Split view">
        <IconButton
          aria-label="Split view"
          size="sm"
          variant="ghost"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="5" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
              <rect x="14" y="5" width="6" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          }
        />
      </Tooltip>
      <Tooltip label="Settings">
        <IconButton
          aria-label="Settings"
          size="sm"
          variant="ghost"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 15a7.6 7.6 0 0 0 .1-2l2-1.2-2-3.5-2.3.8a7.7 7.7 0 0 0-1.7-1l-.3-2.4H9.8l-.3 2.4a7.7 7.7 0 0 0-1.7 1l-2.3-.8-2 3.5 2 1.2a7.6 7.6 0 0 0 0 2l-2 1.2 2 3.5 2.3-.8a7.7 7.7 0 0 0 1.7 1l.3 2.4h4.2l.3-2.4a7.7 7.7 0 0 0 1.7-1l2.3.8 2-3.5-2-1.2Z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </Tooltip>
    </Flex>
  );
};

export default WorkspaceActions;

import { Flex, IconButton } from "@chakra-ui/react";

const TopBarActions = () => {
  return (
    <Flex gap={1} align="center">
      <IconButton
        aria-label="Copy"
        size="sm"
        variant="ghost"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <rect x="5" y="5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        }
      />
      <IconButton
        aria-label="Open in new"
        size="sm"
        variant="ghost"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 5h5v5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10 14L19 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M19 14v5H5V5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
      <IconButton
        aria-label="Refresh"
        size="sm"
        variant="ghost"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M20 12a8 8 0 1 1-2.3-5.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
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
      <IconButton
        aria-label="Share"
        size="sm"
        variant="ghost"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="1.6" />
            <path d="M8.6 11l6.8-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8.6 13l6.8 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        }
      />
    </Flex>
  );
};

export default TopBarActions;

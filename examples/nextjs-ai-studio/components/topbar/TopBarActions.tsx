import { Flex, IconButton } from "@chakra-ui/react";

import MyTooltip from "../ui/MyTooltip";
import {
  CopyIcon,
  DownloadIcon,
  OpenInNewIcon,
  RefreshIcon,
  RunIcon,
  SettingsIcon,
  ShareIcon,
  SplitViewIcon,
} from "../common/Icon";

const TopBarActions = () => {
  return (
    <Flex gap={1} align="center">
      <MyTooltip label="Run">
        <IconButton
          aria-label="Run"
          size="sm"
          variant="ghost"
          icon={<RunIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Copy">
        <IconButton
          aria-label="Copy"
          size="sm"
          variant="ghost"
          icon={<CopyIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Open in new">
        <IconButton
          aria-label="Open in new"
          size="sm"
          variant="ghost"
          icon={<OpenInNewIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Refresh">
        <IconButton
          aria-label="Refresh"
          size="sm"
          variant="ghost"
          icon={<RefreshIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Download">
        <IconButton
          aria-label="Download"
          size="sm"
          variant="ghost"
          icon={<DownloadIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Share">
        <IconButton
          aria-label="Share"
          size="sm"
          variant="ghost"
          icon={<ShareIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Split view">
        <IconButton
          aria-label="Split view"
          size="sm"
          variant="ghost"
          icon={<SplitViewIcon />}
        />
      </MyTooltip>
      <MyTooltip label="Settings">
        <IconButton
          aria-label="Settings"
          size="sm"
          variant="ghost"
          icon={<SettingsIcon />}
        />
      </MyTooltip>
    </Flex>
  );
};

export default TopBarActions;

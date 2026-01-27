import { Button, Flex } from "@chakra-ui/react";

import TopBarActions from "./topbar/TopBarActions";
import TopBarTitle from "./topbar/TopBarTitle";
import TopBarTokenInput from "./topbar/TopBarTokenInput";

type TopBarProps = {
  token: string;
  loading: boolean;
  onTokenChange: (value: string) => void;
  onLoad: () => void;
};

const TopBar = ({ token, loading, onTokenChange, onLoad }: TopBarProps) => {
  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      gap={4}
      wrap="wrap"
      border="1px solid"
      borderColor="gray.200"
      bg="whiteAlpha.900"
      borderRadius="xl"
      px={4}
      py={3}
      boxShadow="sm"
    >
      <Flex align="center" gap={3}>
        <Button size="sm" variant="outline">
          Back to start
        </Button>
        <TopBarTitle />
      </Flex>
      <Flex align="center" gap={3} flex="1" justify="center">
        <TopBarTokenInput token={token} loading={loading} onTokenChange={onTokenChange} onLoad={onLoad} />
      </Flex>
      <TopBarActions />
    </Flex>
  );
};

export default TopBar;

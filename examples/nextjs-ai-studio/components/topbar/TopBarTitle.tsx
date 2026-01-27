import { Flex, Text } from "@chakra-ui/react";

const TopBarTitle = () => {
  return (
    <Flex align="center" gap={2} minW="220px">
      <Text fontSize="sm" fontWeight="600" color="gray.700">
        AsianInfo Digital AIGC Platform
      </Text>
      <Flex
        align="center"
        justify="center"
        w="22px"
        h="22px"
        borderRadius="full"
        border="1px solid"
        borderColor="gray.200"
        fontSize="xs"
        color="gray.500"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
          <path
            d="M4 20h4l10-10-4-4L4 16v4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M14 6l4 4"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </Flex>
    </Flex>
  );
};

export default TopBarTitle;

import { Flex, Text } from "@chakra-ui/react";

interface ExecutionSummaryRowProps {
  durationSeconds?: number;
  nodeCount: number;
}

const ExecutionSummaryRow = ({ durationSeconds, nodeCount }: ExecutionSummaryRowProps) => {
  return (
    <Flex color="gray.500" fontSize="xs" gap={3} mt={1} px={2} wrap="wrap">
      <Text>执行节点: {nodeCount}</Text>
      {durationSeconds !== undefined ? <Text>耗时: {durationSeconds.toFixed(2)}s</Text> : null}
    </Flex>
  );
};

export default ExecutionSummaryRow;


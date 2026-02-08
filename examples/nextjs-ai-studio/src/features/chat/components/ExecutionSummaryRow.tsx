import { Flex, Text } from "@chakra-ui/react";
import { useTranslation } from "next-i18next";

interface ExecutionSummaryRowProps {
  durationSeconds?: number;
  nodeCount: number;
}

const ExecutionSummaryRow = ({ durationSeconds, nodeCount }: ExecutionSummaryRowProps) => {
  const { t } = useTranslation();
  return (
    <Flex color="gray.500" fontSize="xs" gap={3} mt={1} px={2} wrap="wrap">
      <Text>{t("chat:execution_nodes", { defaultValue: "执行节点" })}: {nodeCount}</Text>
      {durationSeconds !== undefined ? (
        <Text>{t("chat:elapsed_time", { defaultValue: "耗时" })}: {durationSeconds.toFixed(2)}s</Text>
      ) : null}
    </Flex>
  );
};

export default ExecutionSummaryRow;

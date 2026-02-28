import { Button, Flex, Text } from "@chakra-ui/react";
import { BackIcon, SettingsIcon } from "@components/common/Icon";

type SkillsPageHeaderProps = {
  onBack: () => void;
};

const iconStyle = { width: 14, height: 14 };

const SkillsPageHeader = ({ onBack }: SkillsPageHeaderProps) => {
  return (
    <Flex
      align="center"
      justify="space-between"
      h="56px"
      px={4}
      borderBottom="1px solid"
      borderColor="rgba(226,232,240,0.9)"
      bg="rgba(255,255,255,0.82)"
      backdropFilter="blur(10px)"
      flexShrink={0}
    >
      <Button
        size="sm"
        variant="ghost"
        leftIcon={<BackIcon style={iconStyle} />}
        onClick={onBack}
        color="myGray.700"
      >
        Back
      </Button>

      <Text fontSize="lg" fontWeight="700" color="myGray.800" letterSpacing="-0.01em">
        Skills Studio
      </Text>

      <Button size="sm" variant="ghost" leftIcon={<SettingsIcon style={iconStyle} />} color="myGray.700">
        设置
      </Button>
    </Flex>
  );
};

export default SkillsPageHeader;


import { Flex } from "@chakra-ui/react";

import ProjectList from "../components/ProjectList";

const HomePage = () => {
  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <ProjectList />
    </Flex>
  );
};

export default HomePage;

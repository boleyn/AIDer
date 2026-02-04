import { Flex } from "@chakra-ui/react";
import type { GetServerSideProps } from "next";

import ProjectList from "../components/ProjectList";
import { getAuthUserFromRequest } from "../utils/auth/ssr";

const HomePage = () => {
  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <ProjectList />
    </Flex>
  );
};

export default HomePage;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const authUser = getAuthUserFromRequest(context.req);
  if (!authUser) {
    return {
      redirect: {
        destination: `/login?lastRoute=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  return { props: {} };
};

import type { GetServerSideProps } from "next";
import type { SandpackPredefinedTemplate } from "@codesandbox/sandpack-react";

import StudioShell, { type SandpackFiles } from "../../components/StudioShell";
import { getProject } from "../../utils/projectStorage";
import { getAuthUserFromRequest } from "../../utils/auth/ssr";

type RunPageProps = {
  token: string;
  initialProject?: {
    token: string;
    name: string;
    template: SandpackPredefinedTemplate;
    files: SandpackFiles;
    dependencies?: Record<string, string>;
  } | null;
};

const RunPage = ({ token, initialProject }: RunPageProps) => {
  if (!token) {
    return null;
  }

  return (
    <StudioShell
      initialToken={token}
      initialProject={initialProject ?? undefined}
      key={token}
    />
  );
};

export const getServerSideProps: GetServerSideProps<RunPageProps> = async (context) => {
  const authUser = getAuthUserFromRequest(context.req);
  if (!authUser) {
    return {
      redirect: {
        destination: `/login?lastRoute=${encodeURIComponent(context.resolvedUrl)}`,
        permanent: false,
      },
    };
  }

  const token = typeof context.params?.token === "string" ? context.params.token : "";

  if (!token) {
    return { notFound: true };
  }

  const project = await getProject(token);

  if (!project) {
    return { notFound: true };
  }
  if (project.userId && project.userId !== authUser.sub) {
    return { notFound: true };
  }

  return {
    props: {
      token,
      initialProject: {
        token: project.token,
        name: project.name,
        template: project.template as SandpackPredefinedTemplate,
        files: project.files,
        dependencies: project.dependencies || {},
      },
    },
  };
};

export default RunPage;

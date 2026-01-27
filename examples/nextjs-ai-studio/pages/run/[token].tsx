import { useRouter } from "next/router";

import StudioShell from "../../components/StudioShell";

const RunPage = () => {
  const router = useRouter();
  const token = typeof router.query.token === "string" ? router.query.token : "";

  return <StudioShell initialToken={token} />;
};

export default RunPage;

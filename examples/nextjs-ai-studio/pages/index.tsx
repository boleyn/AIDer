import { useEffect } from "react";
import { useRouter } from "next/router";

import StudioShell from "../components/StudioShell";

const HomePage = () => {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (typeof code === "string" && code.length > 0) {
      router.replace(`/run/${encodeURIComponent(code)}`);
    }
  }, [code, router]);

  return <StudioShell />;
};

export default HomePage;

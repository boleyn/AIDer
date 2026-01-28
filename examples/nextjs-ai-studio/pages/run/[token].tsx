import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import StudioShell from "../../components/StudioShell";

const RunPage = () => {
  const router = useRouter();
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    // 当路由准备好时，获取token
    if (router.isReady) {
      const routeToken = typeof router.query.token === "string" ? router.query.token : "";
      setToken(routeToken);
    }
  }, [router.isReady, router.query.token]);

  // 如果路由还没准备好，显示加载状态
  if (!router.isReady || !token) {
    return null;
  }

  return <StudioShell initialToken={token} key={token} />;
};

export default RunPage;

import { useEffect, useState } from "react";

export const useScreen = () => {
  const [isPc, setIsPc] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsPc(window.innerWidth >= 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return { isPc };
};

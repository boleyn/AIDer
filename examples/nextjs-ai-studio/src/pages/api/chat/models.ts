import { getChatModelCatalog } from "@server/aiProxy/modelCatalog";
import { requireAuth } from "@server/auth/session";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).json({ error: `方法 ${req.method} 不被允许` });
    return;
  }

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const forceRefresh = req.query.refresh === "1";
  const catalog = await getChatModelCatalog(forceRefresh);

  res.status(200).json(catalog);
}

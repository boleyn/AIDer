import { MongoClient } from "mongodb";

declare global {
  // eslint-disable-next-line no-var
  var __mongoClientPromise: Promise<MongoClient> | undefined;
}

const getClientPromise = () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("缺少 MONGODB_URI 环境变量。");
  }
  if (!global.__mongoClientPromise) {
    global.__mongoClientPromise = new MongoClient(uri, {
      maxPoolSize: 10,
    }).connect();
  }
  return global.__mongoClientPromise;
};

export async function getMongoDb() {
  const client = await getClientPromise();
  return client.db();
}

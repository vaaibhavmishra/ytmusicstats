import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI as string;
const globalForMongo = globalThis as unknown as {
  _authMongoClient?: MongoClient;
};

const client =
  globalForMongo._authMongoClient ??
  new MongoClient(uri, {
    maxPoolSize: 3,
    minPoolSize: 0,
    maxIdleTimeMS: 10000,
  });

globalForMongo._authMongoClient = client;

const db = client.db("ytmusic-stats");

export const auth = betterAuth({
  database: mongodbAdapter(db),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
  },
});

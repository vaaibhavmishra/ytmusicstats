// biome-ignore lint/correctness/noUnusedImports: Mongoose type is used in the global declaration below
import mongoose, { type Mongoose } from "mongoose";

const MONGODB_URI_RAW = process.env.MONGODB_URI;

if (!MONGODB_URI_RAW) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

const MONGODB_URI: string = MONGODB_URI_RAW;

declare global {
  // biome-ignore lint/suspicious/noRedeclare: standard Next.js global caching pattern for Mongoose
  var mongoose: {
    conn: Mongoose | null;
    promise: Promise<Mongoose> | null;
  };
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      dbName: "ytmusic-stats",
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;

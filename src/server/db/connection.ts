import "server-only";
import mongoose from "mongoose";
import { getDatabaseEnvironment } from "@/server/config/env";

const databaseGlobal = globalThis as typeof globalThis & {
  mongooseConnection?: Promise<typeof mongoose>;
};

export async function connectDatabase(): Promise<typeof mongoose> {
  if (!databaseGlobal.mongooseConnection) {
    const { MONGODB_URI } = getDatabaseEnvironment();
    databaseGlobal.mongooseConnection = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    }).catch(() => {
      databaseGlobal.mongooseConnection = undefined;
      throw new Error("Database connection unavailable.");
    });
  }
  return databaseGlobal.mongooseConnection;
}

import "server-only";
import { isIP } from "node:net";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { connectDatabase } from "@/server/db/connection";
import { AppError } from "@/server/http/errors";
import { hashToken } from "./credentials";

const schema = new Schema(
  {
    _id: { type: String, required: true },
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
  },
  { collection: "auth_rate_limits" },
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const RateLimit =
  (mongoose.models.AuthRateLimit as Model<InferSchemaType<typeof schema>>) ||
  mongoose.model("AuthRateLimit", schema);
let indexes: Promise<unknown> | undefined;
export async function consumeLimit(
  key: string,
  limit: number,
  windowMs = 15 * 60 * 1000,
) {
  await connectDatabase();
  indexes ??= RateLimit.createIndexes().catch((error) => {
    indexes = undefined;
    throw error;
  });
  await indexes;
  const bucket = Math.floor(Date.now() / windowMs);
  const id = hashToken(`${key}:${bucket}`);
  let record;
  try {
    record = await RateLimit.findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date((bucket + 1) * windowMs) },
      },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    // Concurrent first requests can race on the unique bucket ID.
    if (
      !(error instanceof mongoose.mongo.MongoServerError) ||
      error.code !== 11000
    )
      throw error;
    record = await RateLimit.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    );
  }
  if (!record || record.count > limit)
    throw new AppError(
      "RATE_LIMITED",
      "Too many attempts. Please wait 15 minutes and try again.",
      429,
    );
}
export async function limitAuthRequest(request: Request, action: string) {
  // Local Route Handlers have no trusted remote-address source. Keep the
  // handler's email/token limits, rather than grouping every user together.
  if (
    process.env.VERCEL !== "1" &&
    (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test")
  ) return;

  // Trust only the header overwritten by our selected production host.
  // Never fall back to caller-controlled x-forwarded-for / x-real-ip.
  const address = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.trim()
    : undefined;
  const family = address ? isIP(address) : 0;
  if (!address || !family) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Account services are temporarily unavailable. Please try again.",
      503,
    );
  }
  // Equivalent IPv6 spellings must not create independent counters.
  const client = family === 6
    ? new URL(`http://[${address}]/`).hostname
    : address;
  await consumeLimit(
    `${action}:ip:${client}`,
    action === "forgot-password" ? 10 : 30,
  );
}

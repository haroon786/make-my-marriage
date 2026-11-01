import "server-only";
import { getAppOrigin } from "@/server/config/env";
import { AppError } from "@/server/http/errors";

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = getAppOrigin();
  const allowed = new Set([expected]);
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(expected);
    if (["localhost", "127.0.0.1"].includes(url.hostname)) {
      url.hostname = url.hostname === "localhost" ? "127.0.0.1" : "localhost";
      allowed.add(url.origin);
    }
  }
  if (
    !origin ||
    !allowed.has(origin) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  ) {
    throw new AppError(
      "FORBIDDEN",
      "This request could not be verified. Refresh the page and try again.",
      403,
    );
  }
}

export async function readJson(request: Request): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new AppError("UNSUPPORTED_MEDIA_TYPE", "Send a JSON request.", 415);
  }
  const reader = request.body?.getReader();
  if (!reader)
    throw new AppError("INVALID_JSON", "Request data is required.", 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 8192) {
        await reader.cancel();
        throw new AppError(
          "PAYLOAD_TOO_LARGE",
          "The submitted data is too large.",
          413,
        );
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      "INVALID_JSON",
      "The submitted data could not be read.",
      400,
    );
  } finally {
    reader.releaseLock();
  }
}

import "server-only";
import { type NextRequest } from "next/server";
import { currentUser, getCurrentContext } from "@/modules/auth/service";
import { SESSION_COOKIE } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { dataResponse, errorResponse } from "@/server/http/responses";
import { assertSameOrigin, readJson } from "@/server/security/requests";
import { consumeLimit } from "@/server/security/rate-limit";
import { createWeddingSchema, updateWeddingSchema } from "./schemas";
import { Wedding } from "./models";
import { connectDatabase } from "@/server/db/connection";
import { getWeddingSummary } from "./service";
import { createWedding } from "./service";

export async function createWeddingHandler(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const user = await currentUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!user) throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
    const input = createWeddingSchema.parse(await readJson(request));
    await consumeLimit(`wedding:create:${user.id}`, 20);
    return dataResponse(await createWedding(user.id, input), 201);
  } catch (error) { return errorResponse(error); }
}
export async function getWeddingHandler(request: NextRequest) {
  try {
    const context = await getCurrentContext(request.cookies.get(SESSION_COOKIE)?.value);
    if (!context) throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
    if (!context.wedding) throw new AppError("WEDDING_NOT_FOUND", "Create your wedding to get started.", 404);
    return dataResponse(context.wedding);
  } catch (error) { return errorResponse(error); }
}

export async function updateWeddingHandler(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const context = await getCurrentContext(request.cookies.get(SESSION_COOKIE)?.value);
    if (!context) throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
    if (!context.wedding || !context.membership || !["ADMIN", "MANAGER"].includes(context.membership.role))
      throw new AppError("FORBIDDEN", "You cannot edit this wedding.", 403);
    const expectedWedding = request.headers.get("X-Wedding-Id");
    if (expectedWedding && expectedWedding !== context.wedding.id)
      throw new AppError("FORBIDDEN", "Your signed-in wedding has changed. Log in to the original account before retrying.", 403);
    const input = updateWeddingSchema.parse(await readJson(request));
    await consumeLimit(`wedding:update:${context.user.id}`, 60);
    await connectDatabase();
    const changes: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) changes[key === "location" ? "location.formattedAddress" : key] = key === "location" ? input.location!.formattedAddress : value;
    }
    const result = await Wedding.updateOne({ _id: context.wedding.id, deletedAt: null }, { $set: changes }, { runValidators: true });
    if (!result.matchedCount) throw new AppError("WEDDING_NOT_FOUND", "This wedding is no longer available.", 404);
    return dataResponse(await getWeddingSummary(context.wedding.id));
  } catch (error) { return errorResponse(error); }
}

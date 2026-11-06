import "server-only";
import type { NextRequest } from "next/server";
import { currentUser, getCurrentContext } from "@/modules/auth/service";
import { SESSION_COOKIE } from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { dataResponse, errorResponse } from "@/server/http/responses";
import { assertSameOrigin, readJson } from "@/server/security/requests";
import { consumeLimit, limitAuthRequest } from "@/server/security/rate-limit";
import { invitationSchema } from "./schemas";
import * as members from "./invitations";

type Action = "members" | "invitations" | "invite" | "resend" | "revoke" | "remove";
export async function membersHandler(request: NextRequest, action: Action, id = "") {
  try {
    const mutation = !["members", "invitations"].includes(action);
    if (mutation) assertSameOrigin(request);
    const context = await getCurrentContext(request.cookies.get(SESSION_COOKIE)?.value);
    if (!context) throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
    if (!context.wedding || !context.membership) throw new AppError("FORBIDDEN", "You do not have access to this wedding.", 403);
    if (action !== "members" && context.membership.role !== "ADMIN") throw new AppError("FORBIDDEN", "Only the wedding Admin can manage members and invitations.", 403);
    const expected = request.headers.get("X-Wedding-Id");
    if (mutation && expected && expected !== context.wedding.id) throw new AppError("FORBIDDEN", "Your signed-in wedding has changed. Refresh this page before continuing.", 403);
    const weddingId = context.wedding.id;
    const names = `${context.wedding.brideName} & ${context.wedding.groomName}`;
    if (mutation) await consumeLimit(`members:${action}:${context.user.id}`, action === "invite" || action === "resend" ? 10 : 30);
    if (action === "members") return dataResponse(await members.listMembers(weddingId));
    if (action === "invitations") return dataResponse(await members.listInvitations(weddingId));
    if (action === "invite") {
      const { email } = invitationSchema.parse(await readJson(request));
      return dataResponse(await members.inviteMember(weddingId, context.user.id, email, names), 201);
    }
    if (action === "resend") return dataResponse(await members.resendInvitation(weddingId, id, names));
    if (action === "revoke") return dataResponse(await members.revokeInvitation(weddingId, id));
    return dataResponse(await members.removeMember(weddingId, id));
  } catch (error) { return errorResponse(error); }
}
export async function invitationHandler(request: NextRequest, token: string, action: "view" | "accept" | "decline") {
  try {
    if (action === "view") {
      await limitAuthRequest(request, "invitation-view");
      return dataResponse(await members.publicInvitation(token));
    }
    assertSameOrigin(request);
    const user = await currentUser(request.cookies.get(SESSION_COOKIE)?.value);
    if (!user) throw new AppError("UNAUTHENTICATED", "Log in with the invited email address, then return to this invitation.", 401);
    await consumeLimit(`invitation-response:${user.id}`, 30);
    return dataResponse(await members.respondToInvitation(token, user, action));
  } catch (error) { return errorResponse(error); }
}

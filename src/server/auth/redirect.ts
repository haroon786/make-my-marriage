import "server-only";
import { redirect } from "next/navigation";
import { readAuthContext } from "./session";
import { AppError } from "@/server/http/errors";
import { invitationReturnPath } from "@/modules/members/schemas";

export async function redirectSignedInUser(next?: string) {
  let context;
  try {
    context = await readAuthContext();
  } catch (error) {
    // Login must remain reachable if a stale cookie exists before services are configured.
    if (error instanceof AppError && error.status === 503) return;
    throw error;
  }
  if (context) redirect(invitationReturnPath(next) || (context.wedding ? "/app" : "/onboarding"));
}

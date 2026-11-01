import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { type NextResponse } from "next/server";
import { getCurrentContext, SESSION_SECONDS } from "@/modules/auth/service";

export const SESSION_COOKIE = "mmm_session";
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}
export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function readAuthContext() {
  return getCurrentContext((await cookies()).get(SESSION_COOKIE)?.value);
}
export async function requireAuthContext() {
  const context = await readAuthContext();
  if (!context) redirect("/login");
  return context;
}

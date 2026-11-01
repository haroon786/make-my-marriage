import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSessionCookie,
  SESSION_COOKIE,
  setSessionCookie,
} from "@/server/auth/session";
import { AppError } from "@/server/http/errors";
import { dataResponse, errorResponse } from "@/server/http/responses";
import { assertSameOrigin, readJson } from "@/server/security/requests";
import { consumeLimit, limitAuthRequest } from "@/server/security/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  normalizeEmail,
  resetPasswordSchema,
  signupSchema,
} from "./schemas";
import * as auth from "./service";

async function mutation<T>(
  request: NextRequest,
  action: string,
  schema: z.ZodType<T>,
  handler: (input: T) => Promise<NextResponse>,
) {
  try {
    assertSameOrigin(request);
    const input = schema.parse(await readJson(request));
    await limitAuthRequest(request, action);
    const response = await handler(input);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export function signupHandler(request: NextRequest) {
  return mutation(request, "signup", signupSchema, async (input) => {
    await consumeLimit(`signup:email:${normalizeEmail(input.email)}`, 5);
    const result = await auth.signup(input);
    const response = dataResponse(result.data, 201);
    setSessionCookie(response, result.token);
    return response;
  });
}
export function loginHandler(request: NextRequest) {
  return mutation(request, "login", loginSchema, async (input) => {
    await consumeLimit(`login:email:${normalizeEmail(input.email)}`, 10);
    const result = await auth.login(input);
    const response = dataResponse(result.data);
    setSessionCookie(response, result.token);
    return response;
  });
}
export function forgotPasswordHandler(request: NextRequest) {
  return mutation(
    request,
    "forgot-password",
    forgotPasswordSchema,
    async (input) => {
      await consumeLimit(`forgot:email:${normalizeEmail(input.email)}`, 3);
      await auth.forgotPassword(input.email);
      return NextResponse.json({ success: true });
    },
  );
}
export function resetPasswordHandler(request: NextRequest) {
  return mutation(
    request,
    "reset-password",
    resetPasswordSchema,
    async (input) => {
      await consumeLimit(`reset:token:${input.token}`, 5);
      await auth.resetPassword(input.token, input.password);
      const response = NextResponse.json({ success: true });
      clearSessionCookie(response);
      return response;
    },
  );
}
export async function logoutHandler(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const user = await auth.currentUser(token);
    if (!user || !token) {
      const response = errorResponse(
        new AppError("UNAUTHENTICATED", "Please log in to continue.", 401),
      );
      clearSessionCookie(response);
      return response;
    }
    await auth.logout(token);
    const response = NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
    clearSessionCookie(response);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
export async function meHandler(request: NextRequest) {
  try {
    const context = await auth.getCurrentContext(
      request.cookies.get(SESSION_COOKIE)?.value,
    );
    if (!context)
      throw new AppError("UNAUTHENTICATED", "Please log in to continue.", 401);
    return dataResponse(context);
  } catch (error) {
    return errorResponse(error);
  }
}

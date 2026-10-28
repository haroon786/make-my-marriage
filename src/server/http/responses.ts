import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./errors";

export function dataResponse<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status, headers: { "Cache-Control": "no-store" } });
}

export function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    const details = Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "body", issue.message]));
    return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Invalid request data", details } }, { status: 400 });
  }
  if (error instanceof AppError) {
    return NextResponse.json({ error: { code: error.code, message: error.message, ...(error.details && { details: error.details }) } }, { status: error.status });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, { status: 500 });
}

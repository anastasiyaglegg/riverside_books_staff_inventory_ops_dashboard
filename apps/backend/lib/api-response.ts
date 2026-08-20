import { NextResponse } from "next/server";
import type { ZodError } from "zod";

// `meta` is additive (e.g. pagination info) -- callers that don't know about it
// keep working unchanged since `data` stays whatever shape it always was.
export function ok<T>(data: T, status = 200, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, error: null, ...(meta && { meta }) }, { status });
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ data: null, error: { message, code: code ?? null } }, { status });
}

export function failValidation(error: ZodError) {
  return fail(error.issues[0]?.message ?? "Invalid request", 400, "VALIDATION_ERROR");
}

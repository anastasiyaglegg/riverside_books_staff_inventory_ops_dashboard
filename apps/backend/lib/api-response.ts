import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null }, { status });
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ data: null, error: { message, code: code ?? null } }, { status });
}

export function failValidation(error: ZodError) {
  return fail(error.issues[0]?.message ?? "Invalid request", 400, "VALIDATION_ERROR");
}

import { supabase } from "@/lib/supabase";

export class ApiError extends Error {
  status: number;
  code: string | null;
  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function requestWithEnvelope<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta: Record<string, unknown> | undefined }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...init?.headers,
    },
  });

  const body = await response.json();
  if (!response.ok || body.error) {
    throw new ApiError(
      body.error?.message ?? "Request failed",
      response.status,
      body.error?.code ?? null,
    );
  }
  return { data: body.data as T, meta: body.meta };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { data } = await requestWithEnvelope<T>(path, init);
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  // Same as `get`, but also surfaces the response envelope's `meta` (e.g.
  // pagination info) that `get` discards.
  getPaged: <T, M = Record<string, unknown>>(path: string) =>
    requestWithEnvelope<T>(path) as Promise<{ data: T; meta: M }>,
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
};

import { z } from "zod";
import { ApiError } from "./errors";

const metaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

const errorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ListMeta = z.infer<typeof metaSchema>;

async function parseResponse<T>(response: Response, schema: z.ZodType<T>): Promise<{ data: T; meta?: ListMeta }> {
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const parsed = errorSchema.safeParse(json);
    if (parsed.success) {
      throw new ApiError(response.status, parsed.data.error.code, parsed.data.error.message, parsed.data.error.details);
    }
    throw new ApiError(response.status, "REQUEST_FAILED", `Request failed (${response.status})`);
  }
  const envelope = z.object({
    data: schema,
    meta: metaSchema.optional(),
  });
  return envelope.parse(json);
}

function withQuery(path: string, query?: Record<string, string | number | undefined>) {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiGet<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string | number | undefined>) {
  const response = await fetch(withQuery(path, query));
  return parseResponse(response, schema);
}

export async function apiSend<T>(
  path: string,
  schema: z.ZodType<T>,
  { method, body }: { method: string; body?: unknown }
) {
  const response = await fetch(path, {
    method,
    headers: body == null ? undefined : { "Content-Type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  return parseResponse(response, schema);
}

export const apiPost = <T>(path: string, schema: z.ZodType<T>, body?: unknown) =>
  apiSend(path, schema, { method: "POST", body });

export const apiPatch = <T>(path: string, schema: z.ZodType<T>, body?: unknown) =>
  apiSend(path, schema, { method: "PATCH", body });

export const apiDelete = <T>(path: string, schema: z.ZodType<T>) => apiSend(path, schema, { method: "DELETE" });

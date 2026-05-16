// Server-only helpers to authenticate public API requests via API key.
import { createHash } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface ApiKeyAuth {
  userId: string;
  keyId: string;
  scopes: string[];
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Authenticate a request via `Authorization: Bearer <key>` header.
 * Returns the auth context or a Response to return immediately.
 */
export async function authenticateApiKey(
  request: Request,
  requiredScope?: string,
): Promise<ApiKeyAuth | Response> {
  const auth = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim());
  if (!match) {
    return jsonError(401, "missing_api_key", "Provide 'Authorization: Bearer <api_key>' header.");
  }
  const key = match[1].trim();
  if (!key.startsWith("gk_") || key.length < 20 || key.length > 200) {
    return jsonError(401, "invalid_api_key", "Malformed API key.");
  }
  const keyHash = hashApiKey(key);

  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select("id, user_id, scopes, revoked_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    console.error("api_keys lookup failed", error);
    return jsonError(500, "internal_error", "Failed to verify API key.");
  }
  if (!data || data.revoked_at) {
    return jsonError(401, "invalid_api_key", "API key is invalid or revoked.");
  }
  if (requiredScope && !data.scopes.includes(requiredScope)) {
    return jsonError(403, "insufficient_scope", `Missing required scope: ${requiredScope}`);
  }

  // Fire-and-forget last_used_at update.
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { userId: data.user_id, keyId: data.id, scopes: data.scopes };
}

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

export function jsonError(status: number, code: string, message: string): Response {
  return jsonResponse(status, { error: { code, message } });
}

export function optionsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
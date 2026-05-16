import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { randomBytes, createHash } from "crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const VALID_SCOPES = ["candidates:read", "candidates:write", "scorecards:read"] as const;

function generateKey(): { plain: string; prefix: string; hash: string } {
  const raw = randomBytes(24).toString("base64url"); // ~32 chars
  const plain = `gk_live_${raw}`;
  const prefix = plain.slice(0, 12); // gk_live_xxxx
  const hash = createHash("sha256").update(plain).digest("hex");
  return { plain, prefix, hash };
}

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { keys: data ?? [] };
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(100),
      scopes: z.array(z.enum(VALID_SCOPES)).min(1).max(VALID_SCOPES.length),
    }).parse,
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { plain, prefix, hash } = generateKey();
    const { data: row, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: userId,
        name: data.name,
        key_prefix: prefix,
        key_hash: hash,
        scopes: data.scopes,
      })
      .select("id, name, key_prefix, scopes, created_at")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Failed to create key");
    return { key: row, plaintext: plain };
  });

export const revokeApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }).parse)
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
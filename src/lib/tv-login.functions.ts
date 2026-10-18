import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomCode(len: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

/** TV: create a short code + private secret. Public (the TV is signed out). */
export const createTvCode = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = randomCode(6);
  const secret = randomCode(32);
  const { error } = await supabaseAdmin.from("tv_login_codes").insert({ code, secret });
  if (error) throw new Error(error.message);
  return { code, secret };
});

/** Phone (signed in): approve a code shown on the TV. */
export const approveTvCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().toUpperCase().length(6) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tv_login_codes").select("id, status, expires_at").eq("code", data.code).maybeSingle();
    if (!row || row.status !== "pending" || new Date(row.expires_at) < new Date()) {
      throw new Error("invalid_code");
    }
    await supabaseAdmin.from("tv_login_codes")
      .update({ status: "approved", user_id: context.userId }).eq("id", row.id);
    return { ok: true };
  });

/** TV: poll with code + secret; once approved, returns a one-time sign-in token. */
export const pollTvCode = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().length(6), secret: z.string().length(32) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("tv_login_codes").select("id, status, user_id, expires_at, secret")
      .eq("code", data.code).maybeSingle();
    if (!row || row.secret !== data.secret) return { status: "invalid" as const };
    if (new Date(row.expires_at) < new Date()) return { status: "expired" as const };
    if (row.status !== "approved" || !row.user_id) return { status: row.status as "pending" | "used" };
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(row.user_id);
    const email = u?.user?.email;
    if (!email) return { status: "invalid" as const };
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.properties?.hashed_token) return { status: "invalid" as const };
    await supabaseAdmin.from("tv_login_codes").update({ status: "used" }).eq("id", row.id);
    return { status: "approved" as const, tokenHash: link.properties.hashed_token };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PARENT_UNLOCK_WINDOW_MS } from "@/lib/parent-unlock";

const pinSchema = z.object({ pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits") });

export const hasPin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("parent_pins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { hasPin: !!data };
  });

export const getParentUnlockStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("parent_pins")
      .select("user_id, unlocked_until")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return { hasPin: false as const, unlocked: true as const, expiresAt: null };
    const until = data.unlocked_until ? new Date(data.unlocked_until as string).getTime() : 0;
    const unlocked = until > Date.now();
    return {
      hasPin: true as const,
      unlocked,
      expiresAt: unlocked ? new Date(until).toISOString() : null,
    };
  });

/** True when the session was just created from an emailed sign-in link (PIN reset flow). */
function recentEmailLinkSignIn(claims: any): boolean {
  const amr = Array.isArray(claims?.amr) ? claims.amr : [];
  const now = Date.now() / 1000;
  return amr.some((a: any) => (a?.method === "otp" || a?.method === "magiclink") && now - Number(a?.timestamp ?? 0) < 15 * 60);
}

export const setPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pin: pinSchema.shape.pin, currentPin: pinSchema.shape.pin.optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("parent_pins").select("pin_hash, unlocked_until").eq("user_id", context.userId).maybeSingle();
    if (existing) {
      // Replacing a PIN requires the current PIN, an open parent session, or a fresh email-link sign-in.
      const unlocked = existing.unlocked_until && new Date(existing.unlocked_until as string).getTime() > Date.now();
      const knowsPin = data.currentPin ? await bcrypt.compare(data.currentPin, existing.pin_hash) : false;
      if (!unlocked && !knowsPin && !recentEmailLinkSignIn(context.claims)) throw new Error("Not allowed");
    }
    const pin_hash = await bcrypt.hash(data.pin, 10);
    const unlocked_until = new Date(Date.now() + PARENT_UNLOCK_WINDOW_MS).toISOString();
    const { error } = await supabaseAdmin
      .from("parent_pins")
      .upsert({ user_id: context.userId, pin_hash, unlocked_until }, { onConflict: "user_id" });
    if (error) throw new Error("Could not save PIN");
    return { ok: true };
  });

export const verifyPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pinSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("parent_pins")
      .select("pin_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { ok: false as const };
    const ok = await bcrypt.compare(data.pin, row.pin_hash);
    if (ok) {
      const unlocked_until = new Date(Date.now() + PARENT_UNLOCK_WINDOW_MS).toISOString();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("parent_pins")
        .update({ unlocked_until })
        .eq("user_id", context.userId);
    }
    return { ok };
  });

export const lockParent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("parent_pins")
      .update({ unlocked_until: null })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const requestPinReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Uses Supabase's built-in magic-link email. On click, the user lands
    // signed-in back on the app, and can set a new PIN in /parent/reset-pin.
    const email = context.claims?.email as string | undefined;
    if (!email) throw new Error("No email on account");
    return { email };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const setPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => pinSchema.parse(d))
  .handler(async ({ data, context }) => {
    const pin_hash = await bcrypt.hash(data.pin, 10);
    const { error } = await context.supabase
      .from("parent_pins")
      .upsert({ user_id: context.userId, pin_hash }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
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
    return { ok };
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREQ = ["off", "daily", "weekly", "monthly"] as const;

export const getSyncSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sync_settings")
      .select("*")
      .eq("parent_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { parent_user_id: context.userId, frequency: "weekly" as const, last_run_at: null };
  });

export const upsertSyncSettings = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ frequency: z.enum(FREQ) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sync_settings")
      .upsert(
        { parent_user_id: context.userId, frequency: data.frequency },
        { onConflict: "parent_user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

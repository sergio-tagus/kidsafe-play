import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentUnlocked } from "@/lib/parent-unlock";
import { requireSuperAdmin } from "@/lib/require-superadmin";

/** Only "off" and the biweekly (14-day) cycle are offered now. */
const FREQ = ["off", "biweekly"] as const;

export const getSyncSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("sync_settings")
      .select("*")
      .eq("parent_user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (
      data ?? {
        parent_user_id: context.userId,
        frequency: "biweekly" as const,
        last_run_at: null,
        auto_paused: false,
        last_active_at: null,
      }
    );
  });

export const upsertSyncSettings = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked, requireSuperAdmin])
  .inputValidator((d: unknown) => z.object({ frequency: z.enum(FREQ) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("sync_settings")
      .upsert(
        { parent_user_id: context.userId, frequency: data.frequency } as never,
        { onConflict: "parent_user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Record that the account is active right now. Resumes automatic sync when it
 * had been paused after 10+ days without activity.
 */
export const touchActivity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: current } = await context.supabase
      .from("sync_settings")
      .select("parent_user_id, auto_paused")
      .eq("parent_user_id", context.userId)
      .maybeSingle();

    const resumed = Boolean((current as any)?.auto_paused);
    const { error } = await context.supabase
      .from("sync_settings")
      .upsert(
        {
          parent_user_id: context.userId,
          last_active_at: new Date().toISOString(),
          auto_paused: false,
        } as never,
        { onConflict: "parent_user_id" },
      );
    if (error) throw new Error(error.message);
    return { resumed };
  });

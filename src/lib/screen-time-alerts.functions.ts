import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentUnlocked } from "@/lib/parent-unlock";
import { extendBonus } from "@/lib/screen-time";

export const listScreenTimeAlerts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("screen_time_alerts")
      .select("id, child_profile_id, date, created_at, child_profiles(profile_name, avatar_emoji)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((a: any) => ({
      id: a.id as string,
      childId: a.child_profile_id as string,
      date: a.date as string,
      name: (a.child_profiles?.profile_name ?? "") as string,
      emoji: (a.child_profiles?.avatar_emoji ?? "🙂") as string,
    }));
  });

async function loadOwnAlert(supabase: any, alertId: string) {
  const { data } = await supabase
    .from("screen_time_alerts")
    .select("id, child_profile_id, date")
    .eq("id", alertId)
    .maybeSingle();
  if (!data) throw new Error("Forbidden");
  return data as { id: string; child_profile_id: string; date: string };
}

export const extendScreenTime = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ alertId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const alert = await loadOwnAlert((context as any).supabase, data.alertId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: st } = await supabaseAdmin
      .from("screen_time_daily")
      .select("id, bonus_minutes")
      .eq("child_profile_id", alert.child_profile_id)
      .eq("date", alert.date)
      .maybeSingle();
    if (st) {
      await supabaseAdmin
        .from("screen_time_daily")
        .update({ bonus_minutes: extendBonus(Number(st.bonus_minutes ?? 0)) })
        .eq("id", st.id);
    } else {
      await supabaseAdmin.from("screen_time_daily").insert({
        child_profile_id: alert.child_profile_id,
        date: alert.date,
        minutes_watched: 0,
        bonus_minutes: extendBonus(0),
      });
    }
    // Reset to pending-able state for a new alert if the extra hour also runs out.
    await supabaseAdmin.from("screen_time_alerts").delete().eq("id", alert.id);
    return { ok: true };
  });

export const dismissScreenTimeAlert = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ alertId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const alert = await loadOwnAlert((context as any).supabase, data.alertId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("screen_time_alerts")
      .update({ status: "dismissed", resolved_at: new Date().toISOString() })
      .eq("id", alert.id);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentUnlocked } from "@/lib/parent-unlock";

const DEFAULT_QUOTA = 10000;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const getApiUsageSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ days: z.number().int().min(1).max(90).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (data.days - 1));
    const sinceKey = dayKey(since);

    const { data: rows, error } = await context.supabase
      .from("youtube_api_usage")
      .select("day, operation, units, calls")
      .eq("parent_user_id", context.userId)
      .gte("day", sinceKey);
    if (error) throw new Error(error.message);

    const { data: q } = await context.supabase
      .from("api_quota_settings")
      .select("daily_quota")
      .eq("parent_user_id", context.userId)
      .maybeSingle();
    const dailyQuota = (q as any)?.daily_quota ?? DEFAULT_QUOTA;

    const byDayMap = new Map<string, number>();
    const byOpMap = new Map<string, { units: number; calls: number }>();
    for (const r of (rows ?? []) as any[]) {
      byDayMap.set(r.day, (byDayMap.get(r.day) ?? 0) + (r.units ?? 0));
      const cur = byOpMap.get(r.operation) ?? { units: 0, calls: 0 };
      cur.units += r.units ?? 0;
      cur.calls += r.calls ?? 0;
      byOpMap.set(r.operation, cur);
    }

    const byDay: { day: string; units: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const k = dayKey(d);
      byDay.push({ day: k, units: byDayMap.get(k) ?? 0 });
    }

    const todayKey = dayKey(new Date());
    return {
      dailyQuota,
      todayUnits: byDayMap.get(todayKey) ?? 0,
      totalUnits: [...byDayMap.values()].reduce((a, b) => a + b, 0),
      byDay,
      byOperation: [...byOpMap.entries()]
        .map(([operation, v]) => ({ operation, ...v }))
        .sort((a, b) => b.units - a.units),
    };
  });

export const getApiUsageByChannel = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("youtube_api_usage")
      .select("whitelist_channel_id, units, calls")
      .eq("parent_user_id", context.userId)
      .not("whitelist_channel_id", "is", null);
    if (error) throw new Error(error.message);

    const { data: channels } = await context.supabase
      .from("whitelist_channels")
      .select("id, channel_name, channel_thumbnail_url, last_synced_at")
      .eq("parent_user_id", context.userId);

    const map = new Map<string, { units: number; calls: number }>();
    for (const r of (rows ?? []) as any[]) {
      const cur = map.get(r.whitelist_channel_id) ?? { units: 0, calls: 0 };
      cur.units += r.units ?? 0;
      cur.calls += r.calls ?? 0;
      map.set(r.whitelist_channel_id, cur);
    }

    return ((channels ?? []) as any[])
      .map((c) => ({
        id: c.id as string,
        channel_name: c.channel_name as string,
        channel_thumbnail_url: c.channel_thumbnail_url as string | null,
        last_synced_at: c.last_synced_at as string | null,
        units: map.get(c.id)?.units ?? 0,
        calls: map.get(c.id)?.calls ?? 0,
      }))
      .sort((a, b) => b.units - a.units);
  });

export const listSyncRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(100).default(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("youtube_sync_runs")
      .select("*")
      .eq("parent_user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const setQuotaSettings = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({ dailyQuota: z.number().int().min(100).max(100_000_000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_quota_settings")
      .upsert(
        { parent_user_id: context.userId, daily_quota: data.dailyQuota },
        { onConflict: "parent_user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

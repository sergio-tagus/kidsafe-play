import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SafeVideo is the canonical DTO for anything shown to a kid.
// It ALWAYS results from an INNER JOIN on active whitelist channels + RLS scoped to the parent.
export type SafeVideo = {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  created_at: string;
  channel: {
    id: string;
    youtube_channel_id: string;
    channel_name: string;
    channel_handle: string | null;
    channel_thumbnail_url: string | null;
    category: string;
  };
};

const filterInput = z.object({
  childId: z.string().uuid(),
  filter: z.enum(["recent", "popular", "recommended", "byChannel", "byCategory", "search"]).default("recent"),
  category: z.string().min(1).max(60).optional(),
  channelId: z.string().uuid().optional(),
  query: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(60).default(24),
});

async function assertChildOwned(supabase: any, childId: string) {
  const { data, error } = await supabase.from("child_profiles").select("id").eq("id", childId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function mapRow(row: any): SafeVideo {
  const ch = row.whitelist_channels;
  return {
    id: row.id,
    youtube_video_id: row.youtube_video_id,
    title: row.title,
    description: row.description,
    thumbnail_url: row.thumbnail_url,
    duration_seconds: row.duration_seconds,
    published_at: row.published_at,
    created_at: row.created_at,
    channel: {
      id: ch.id,
      youtube_channel_id: ch.youtube_channel_id,
      channel_name: ch.channel_name,
      channel_handle: ch.channel_handle,
      channel_thumbnail_url: ch.channel_thumbnail_url,
      category: ch.category,
    },
  };
}

export const listSafeVideos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filterInput.parse(d))
  .handler(async ({ data, context }): Promise<SafeVideo[]> => {
    await assertChildOwned(context.supabase, data.childId);
    // INNER JOIN via inner-hint; ensures rows only from active whitelist channels
    let q = context.supabase
      .from("videos_cache")
      .select("*, whitelist_channels!inner(id,youtube_channel_id,channel_name,channel_handle,channel_thumbnail_url,category,active)")
      .eq("whitelist_channels.active", true);

    if (data.category || data.filter === "byCategory") {
      const cat = data.category;
      if (cat) q = q.eq("whitelist_channels.category", cat);
    }
    if (data.channelId) q = q.eq("whitelist_channel_id", data.channelId);
    if (data.query && data.query.trim()) {
      const term = data.query.trim().replace(/[%_]/g, "");
      q = q.ilike("title", `%${term}%`);
    }

    // Ordering
    if (data.filter === "recent" || data.filter === "byCategory" || data.filter === "byChannel" || data.filter === "search") {
      q = q.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    } else {
      // recommended/popular use recency as MVP fallback (no telemetry aggregation yet client-side)
      q = q.order("created_at", { ascending: false });
    }

    if (data.filter === "recommended") {
      // Fetch a wider pool and shuffle so each visit shows different picks.
      q = q.limit(Math.min(data.limit * 4, 100));
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      const pool = (rows ?? []).map(mapRow);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, data.limit);
    }

    q = q.limit(data.limit);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []).map(mapRow);
  });

export const getSafeVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid(), videoId: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ data, context }): Promise<SafeVideo | null> => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: row, error } = await context.supabase
      .from("videos_cache")
      .select("*, whitelist_channels!inner(id,youtube_channel_id,channel_name,channel_handle,channel_thumbnail_url,category,active)")
      .eq("youtube_video_id", data.videoId)
      .eq("whitelist_channels.active", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row ? mapRow(row) : null;
  });

// Approved channels the kid can browse
export const listApprovedChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("whitelist_channels")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Favorites ----------
export const listFavorites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SafeVideo[]> => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: favs, error } = await context.supabase
      .from("favorites")
      .select("youtube_video_id, created_at")
      .eq("child_profile_id", data.childId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    if (!favs?.length) return [];
    const ids = favs.map((f: any) => f.youtube_video_id);
    const { data: rows, error: e2 } = await context.supabase
      .from("videos_cache")
      .select("*, whitelist_channels!inner(id,youtube_channel_id,channel_name,channel_handle,channel_thumbnail_url,category,active)")
      .eq("whitelist_channels.active", true)
      .in("youtube_video_id", ids);
    if (e2) throw new Error(e2.message);
    return (rows ?? []).map(mapRow);
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid(), videoId: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: existing } = await context.supabase
      .from("favorites")
      .select("id")
      .eq("child_profile_id", data.childId)
      .eq("youtube_video_id", data.videoId)
      .maybeSingle();
    if (existing) {
      await context.supabase.from("favorites").delete().eq("id", existing.id);
      return { favorited: false };
    }
    await context.supabase.from("favorites").insert({
      child_profile_id: data.childId,
      youtube_video_id: data.videoId,
    });
    return { favorited: true };
  });

export const isFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid(), videoId: z.string().min(6).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: existing } = await context.supabase
      .from("favorites")
      .select("id")
      .eq("child_profile_id", data.childId)
      .eq("youtube_video_id", data.videoId)
      .maybeSingle();
    return { favorited: !!existing };
  });

// ---------- History ----------
export const listHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid(), limit: z.number().int().min(1).max(60).default(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: hist, error } = await context.supabase
      .from("watch_history")
      .select("*")
      .eq("child_profile_id", data.childId)
      .order("watched_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    if (!hist?.length) return [] as Array<{ history: any; video: SafeVideo | null }>;
    const ids = Array.from(new Set(hist.map((h: any) => h.youtube_video_id)));
    const { data: rows, error: e2 } = await context.supabase
      .from("videos_cache")
      .select("*, whitelist_channels!inner(id,youtube_channel_id,channel_name,channel_handle,channel_thumbnail_url,category,active)")
      .eq("whitelist_channels.active", true)
      .in("youtube_video_id", ids);
    if (e2) throw new Error(e2.message);
    const map = new Map<string, SafeVideo>();
    (rows ?? []).forEach((r: any) => map.set(r.youtube_video_id, mapRow(r)));
    return hist.map((h: any) => ({ history: h, video: map.get(h.youtube_video_id) ?? null }));
  });

export const listContinueWatching = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<SafeVideo[]> => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: hist } = await context.supabase
      .from("watch_history")
      .select("youtube_video_id, watch_progress_seconds, total_seconds, watched_at")
      .eq("child_profile_id", data.childId)
      .order("watched_at", { ascending: false })
      .limit(30);
    if (!hist?.length) return [];
    const unfinished = hist.filter(
      (h: any) => !h.total_seconds || h.watch_progress_seconds < (h.total_seconds ?? 0) - 15,
    );
    const seen = new Set<string>();
    const ids = unfinished.filter((h: any) => (seen.has(h.youtube_video_id) ? false : (seen.add(h.youtube_video_id), true))).map((h: any) => h.youtube_video_id);
    if (!ids.length) return [];
    const { data: rows } = await context.supabase
      .from("videos_cache")
      .select("*, whitelist_channels!inner(id,youtube_channel_id,channel_name,channel_handle,channel_thumbnail_url,category,active)")
      .eq("whitelist_channels.active", true)
      .in("youtube_video_id", ids);
    const map = new Map<string, SafeVideo>();
    (rows ?? []).forEach((r: any) => map.set(r.youtube_video_id, mapRow(r)));
    return ids.map((id) => map.get(id)).filter(Boolean) as SafeVideo[];
  });

// ---------- Watch tick + screen time ----------
export const recordWatchTick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      childId: z.string().uuid(),
      videoId: z.string().min(6).max(20),
      progressSeconds: z.number().int().min(0).max(60 * 60 * 24),
      totalSeconds: z.number().int().min(0).max(60 * 60 * 24).optional(),
      deltaSeconds: z.number().min(0).max(120),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertChildOwned(context.supabase, data.childId);
    // Verify video is in whitelist (defense in depth)
    const { data: safe } = await context.supabase
      .from("videos_cache")
      .select("id, whitelist_channels!inner(active)")
      .eq("youtube_video_id", data.videoId)
      .eq("whitelist_channels.active", true)
      .maybeSingle();
    if (!safe) throw new Error("Video not whitelisted");

    // upsert watch_history: keep latest row per video
    const { data: last } = await context.supabase
      .from("watch_history")
      .select("id")
      .eq("child_profile_id", data.childId)
      .eq("youtube_video_id", data.videoId)
      .order("watched_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      await context.supabase
        .from("watch_history")
        .update({
          watch_progress_seconds: data.progressSeconds,
          total_seconds: data.totalSeconds ?? null,
          watched_at: new Date().toISOString(),
        })
        .eq("id", last.id);
    } else {
      await context.supabase.from("watch_history").insert({
        child_profile_id: data.childId,
        youtube_video_id: data.videoId,
        watch_progress_seconds: data.progressSeconds,
        total_seconds: data.totalSeconds ?? null,
      });
    }

    // increment screen_time_daily
    const today = new Date().toISOString().slice(0, 10);
    const minutes = data.deltaSeconds / 60;
    const { data: st } = await context.supabase
      .from("screen_time_daily")
      .select("id, minutes_watched")
      .eq("child_profile_id", data.childId)
      .eq("date", today)
      .maybeSingle();
    if (st) {
      await context.supabase
        .from("screen_time_daily")
        .update({ minutes_watched: Number(st.minutes_watched) + minutes })
        .eq("id", st.id);
    } else {
      await context.supabase.from("screen_time_daily").insert({
        child_profile_id: data.childId,
        date: today,
        minutes_watched: minutes,
      });
    }
    return { ok: true };
  });

export const checkScreenTime = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ childId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertChildOwned(context.supabase, data.childId);
    const { data: kid } = await context.supabase
      .from("child_profiles")
      .select("daily_screen_time_minutes")
      .eq("id", data.childId)
      .single();
    const limit = kid?.daily_screen_time_minutes ?? 60;
    const today = new Date().toISOString().slice(0, 10);
    const { data: st } = await context.supabase
      .from("screen_time_daily")
      .select("minutes_watched")
      .eq("child_profile_id", data.childId)
      .eq("date", today)
      .maybeSingle();
    const watched = Number(st?.minutes_watched ?? 0);
    const remaining = Math.max(0, limit - watched);
    return { allowed: remaining > 0, watched, limit, remaining };
  });

// ---------- Parent stats ----------
export const getParentStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Get all owned children
    const { data: kids } = await context.supabase
      .from("child_profiles")
      .select("id, profile_name, avatar_emoji, daily_screen_time_minutes");
    const kidIds = (kids ?? []).map((k: any) => k.id);

    // Screen time last 30 days
    const from = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: st } = kidIds.length
      ? await context.supabase
          .from("screen_time_daily")
          .select("date, minutes_watched, child_profile_id")
          .in("child_profile_id", kidIds)
          .gte("date", from)
          .order("date", { ascending: true })
      : { data: [] as any[] };

    // Watch history for top charts (last 30 days)
    const { data: history } = kidIds.length
      ? await context.supabase
          .from("watch_history")
          .select("youtube_video_id, watched_at, child_profile_id")
          .in("child_profile_id", kidIds)
          .gte("watched_at", new Date(Date.now() - 30 * 86400_000).toISOString())
      : { data: [] as any[] };

    const videoIds = Array.from(new Set((history ?? []).map((h: any) => h.youtube_video_id)));
    const { data: videos } = videoIds.length
      ? await context.supabase
          .from("videos_cache")
          .select("youtube_video_id, title, thumbnail_url, whitelist_channels!inner(channel_name, category)")
          .in("youtube_video_id", videoIds)
      : { data: [] as any[] };

    const videoMap = new Map<string, any>();
    (videos ?? []).forEach((v: any) => videoMap.set(v.youtube_video_id, v));

    // Aggregate top videos, channels, categories
    const videoCount = new Map<string, number>();
    const channelCount = new Map<string, number>();
    const categoryCount = new Map<string, number>();
    (history ?? []).forEach((h: any) => {
      videoCount.set(h.youtube_video_id, (videoCount.get(h.youtube_video_id) ?? 0) + 1);
      const v = videoMap.get(h.youtube_video_id);
      if (v?.whitelist_channels) {
        channelCount.set(v.whitelist_channels.channel_name, (channelCount.get(v.whitelist_channels.channel_name) ?? 0) + 1);
        categoryCount.set(v.whitelist_channels.category, (categoryCount.get(v.whitelist_channels.category) ?? 0) + 1);
      }
    });

    const topVideos = Array.from(videoCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id, count]) => ({
        youtube_video_id: id,
        views: count,
        title: videoMap.get(id)?.title ?? id,
        thumbnail_url: videoMap.get(id)?.thumbnail_url ?? null,
      }));

    const topChannels = Array.from(channelCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, views: count }));

    const topCategories = Array.from(categoryCount.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, views: count }));

    // Daily buckets
    const dailyMap = new Map<string, number>();
    (st ?? []).forEach((row: any) => {
      dailyMap.set(row.date, (dailyMap.get(row.date) ?? 0) + Number(row.minutes_watched));
    });
    const days: { date: string; minutes: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      days.push({ date: d, minutes: Math.round(dailyMap.get(d) ?? 0) });
    }

    const totalMinutes = days.reduce((s, d) => s + d.minutes, 0);
    const todayMinutes = days[days.length - 1]?.minutes ?? 0;
    const weekMinutes = days.slice(-7).reduce((s, d) => s + d.minutes, 0);

    return {
      kids: kids ?? [],
      days,
      totals: { total: totalMinutes, today: todayMinutes, week: weekMinutes },
      topVideos,
      topChannels,
      topCategories,
    };
  });

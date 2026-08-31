import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentUnlocked } from "@/lib/parent-unlock";

// ---------- child profiles ----------
export const listChildProfiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("child_profiles")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const childInput = z.object({
  id: z.string().uuid().optional(),
  profile_name: z.string().min(1).max(60),
  age: z.number().int().min(1).max(17).nullable().optional(),
  avatar_emoji: z.string().min(1).max(8),
  daily_screen_time_minutes: z.number().int().min(5).max(600),
});

export const upsertChildProfile = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => childInput.parse(d))
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("child_profiles")
        .update({
          profile_name: data.profile_name,
          age: data.age ?? null,
          avatar_emoji: data.avatar_emoji,
          daily_screen_time_minutes: data.daily_screen_time_minutes,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("child_profiles")
      .insert({
        parent_user_id: context.userId,
        profile_name: data.profile_name,
        age: data.age ?? null,
        avatar_emoji: data.avatar_emoji,
        daily_screen_time_minutes: data.daily_screen_time_minutes,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteChildProfile = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("child_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- whitelist channels ----------
// Categories are now stored in `public.categories` (see categories.functions.ts).
// We validate via slug shape and rely on the FK on whitelist_channels.category.
const categorySlug = z.string().min(1).max(60);

export const listWhitelistChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("whitelist_channels")
      .select("*, videos_cache(count)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row: any) => ({
      ...row,
      video_count: row.videos_cache?.[0]?.count ?? 0,
      videos_cache: undefined,
    }));
  });

const channelInput = z.object({
  id: z.string().uuid().optional(),
  youtube_channel_id: z.string().min(1).max(200),
  channel_name: z.string().min(1).max(200),
  channel_handle: z.string().max(200).nullable().optional(),
  channel_thumbnail_url: z.string().url().nullable().optional().or(z.literal("")),
  channel_description: z.string().max(5000).nullable().optional(),
  category: categorySlug,
  active: z.boolean().default(true),
});

export const upsertWhitelistChannel = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => channelInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      parent_user_id: context.userId,
      youtube_channel_id: data.youtube_channel_id,
      channel_name: data.channel_name,
      channel_handle: data.channel_handle || null,
      channel_thumbnail_url: data.channel_thumbnail_url || null,
      channel_description: data.channel_description?.trim() || null,
      category: data.category,
      active: data.active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("whitelist_channels").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("whitelist_channels")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteWhitelistChannel = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("whitelist_channels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateChannelCategory = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({ channelId: z.string().uuid(), category: categorySlug }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("whitelist_channels")
      .update({ category: data.category })
      .eq("id", data.channelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateChannelLanguage = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z
      .object({ channelId: z.string().uuid(), language: z.string().min(1).max(20) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const lang = data.language.trim().toLowerCase().split(/[-_]/)[0] || "unknown";
    const { error } = await context.supabase
      .from("whitelist_channels")
      .update({ language: lang })
      .eq("id", data.channelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });





// ---------- videos ----------
export const listChannelVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ channelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("videos_cache")
      .select("*")
      .eq("whitelist_channel_id", data.channelId)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const videoInput = z.object({
  id: z.string().uuid().optional(),
  whitelist_channel_id: z.string().uuid(),
  youtube_video_id: z.string().min(6).max(20),
  title: z.string().min(1).max(300),
  description: z.string().max(4000).optional().nullable(),
  thumbnail_url: z.string().url().optional().nullable().or(z.literal("")),
  duration_seconds: z.number().int().min(1).max(60 * 60 * 24).optional().nullable(),
  published_at: z.string().optional().nullable(),
});

export const upsertVideo = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => videoInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      parent_user_id: context.userId,
      whitelist_channel_id: data.whitelist_channel_id,
      youtube_video_id: data.youtube_video_id,
      title: data.title,
      description: data.description || null,
      thumbnail_url: data.thumbnail_url || `https://img.youtube.com/vi/${data.youtube_video_id}/hqdefault.jpg`,
      duration_seconds: data.duration_seconds ?? null,
      published_at: data.published_at || null,
    };
    if (data.id) {
      const { error } = await context.supabase.from("videos_cache").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("videos_cache")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("videos_cache").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- YouTube auto-import ----------
// Category slugs live in `public.categories`; validated by shape + FK.

export const UPDATABLE_CHANNEL_FIELDS = [
  "channel_name",
  "channel_handle",
  "channel_thumbnail_url",
  "channel_description",
  "language",
] as const;

export type UpdatableChannelField = (typeof UPDATABLE_CHANNEL_FIELDS)[number];
export type ChannelDiff = {
  field: UpdatableChannelField;
  current: string | null;
  incoming: string | null;
};

const norm = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v);
  return s.length ? s : null;
};

/** Build the list of fields where YouTube data differs from the stored row. */
export function buildChannelDiff(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
): ChannelDiff[] {
  const out: ChannelDiff[] = [];
  for (const field of UPDATABLE_CHANNEL_FIELDS) {
    const inc = norm(incoming[field]);
    const cur = norm(current[field]);
    if (inc === null) continue; // never wipe data with empty YouTube values
    if (field === "language" && inc === "unknown") continue;
    if (inc !== cur) out.push({ field, current: cur, incoming: inc });
  }
  return out;
}

const channelDiffFields = z.array(
  z.object({
    field: z.enum(UPDATABLE_CHANNEL_FIELDS),
    current: z.string().nullable(),
    incoming: z.string().nullable(),
  }),
);

/** Fetch YouTube data for a stored channel and return the pending diff (no writes). */
export const previewChannelUpdate = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ channelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ch, error } = await context.supabase
      .from("whitelist_channels")
      .select("*")
      .eq("id", data.channelId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ch) throw new Error("Channel not found");

    const { fetchChannel, withYtMeter } = await import("@/lib/youtube.server");
    const { recordUsage } = await import("@/lib/api-usage.server");
    const { result: yt, meter } = await withYtMeter(() => fetchChannel((ch as any).youtube_channel_id));
    await recordUsage(context.supabase, context.userId, meter, (ch as any).id);
    const incoming = {
      channel_name: yt.title,
      channel_handle: yt.handle,
      channel_thumbnail_url: yt.thumbnail,
      channel_description: yt.description,
      language: yt.language ?? "unknown",
    };
    return {
      channelId: (ch as any).id as string,
      diff: buildChannelDiff(ch as any, incoming),
    };
  });

/** Apply the parent-approved subset of a diff to the channel row. */
export const applyChannelUpdate = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({ channelId: z.string().uuid(), fields: channelDiffFields }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, string | null> = {};
    for (const f of data.fields) patch[f.field] = f.incoming;
    patch['pending_updates'] = null;
    patch['pending_updates_at'] = null;
    patch['last_synced_at'] = new Date().toISOString();
    const { error } = await context.supabase
      .from("whitelist_channels")
      .update(patch as never)
      .eq("id", data.channelId);
    if (error) throw new Error(error.message);
    const { data: fresh } = await context.supabase
      .from("whitelist_channels")
      .select("*, videos_cache(count)")
      .eq("id", data.channelId)
      .maybeSingle();
    const row: any = fresh ?? null;
    return {
      updated: data.fields.length,
      channel: row
        ? { ...row, video_count: row.videos_cache?.[0]?.count ?? 0, videos_cache: undefined }
        : null,
    };
  });

/** Discard the pending updates detected by the scheduled sync. */
export const dismissPendingUpdates = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ channelId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("whitelist_channels")
      .update({ pending_updates: null, pending_updates_at: null } as never)
      .eq("id", data.channelId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const previewChannelFromUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ url: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ data }) => {
    const { fetchChannel, fetchRecentUploads, inferCategory } = await import("@/lib/youtube.server");
    const ch = await fetchChannel(data.url);
    // Pull first page of uploads to sharpen category inference
    let sampleCategoryIds: (string | null)[] = [];
    let sampleTitle = "";
    let sampleDesc = "";
    try {
      const sample = await fetchRecentUploads(ch.uploadsPlaylistId, 25);
      sampleCategoryIds = sample.map((v) => v.categoryId);
      sampleTitle = sample.map((v) => v.title).slice(0, 5).join(" \n ");
      sampleDesc = sample.map((v) => v.description).slice(0, 3).join(" \n ").slice(0, 2000);
    } catch {
      // fallthrough - use channel-only signals
    }
    const category = inferCategory({
      topicIds: ch.topicIds,
      videoCategoryIds: sampleCategoryIds,
      title: `${ch.title}\n${sampleTitle}`,
      description: `${ch.description}\n${sampleDesc}`,
    });
    return {
      youtube_channel_id: ch.id,
      channel_name: ch.title,
      channel_handle: ch.handle,
      channel_thumbnail_url: ch.thumbnail,
      channel_description: ch.description?.trim() || null,
      subscriberCount: ch.subscriberCount,
      videoCount: ch.videoCount,
      category,
    };
  });

async function importVideosForChannel(
  supabase: any,
  parentUserId: string,
  channelRowId: string,
  uploadsPlaylistId: string,
  videoLimit: number,
): Promise<number> {
  const { fetchRecentUploads } = await import("@/lib/youtube.server");
  const videos = await fetchRecentUploads(uploadsPlaylistId, videoLimit);
  if (!videos.length) return 0;
  const rows = videos.map((v) => ({
    parent_user_id: parentUserId,
    whitelist_channel_id: channelRowId,
    youtube_video_id: v.youtube_video_id,
    title: v.title,
    description: v.description || null,
    thumbnail_url: v.thumbnail || `https://img.youtube.com/vi/${v.youtube_video_id}/hqdefault.jpg`,
    duration_seconds: v.durationSeconds,
    published_at: v.publishedAt,
  }));
  const { error } = await supabase
    .from("videos_cache")
    .upsert(rows, { onConflict: "parent_user_id,youtube_video_id" });
  if (error) throw new Error(error.message);
  return rows.length;
}

export const importChannelFromUrl = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({
      url: z.string().min(1).max(500),
      category: categorySlug.optional(),
      videoLimit: z.number().int().min(1).max(500).default(200),
      confirmOverwrite: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { fetchChannel, inferCategory, createMeter, setActiveMeter } = await import("@/lib/youtube.server");
    const { recordUsage } = await import("@/lib/api-usage.server");
    const meter = createMeter();
    const restoreMeter = setActiveMeter(meter);
    const flush = async (channelId: string | null) => {
      restoreMeter();
      await recordUsage(context.supabase, context.userId, meter, channelId);
    };
    const ch = await fetchChannel(data.url).catch(async (e) => {
      await flush(null);
      throw e;
    });
    const category = data.category ?? inferCategory({
      topicIds: ch.topicIds,
      title: ch.title,
      description: ch.description,
    });

    // Upsert channel
    const { data: existing } = await context.supabase
      .from("whitelist_channels")
      .select("*")
      .eq("parent_user_id", context.userId)
      .eq("youtube_channel_id", ch.id)
      .maybeSingle();

    const incoming = {
      channel_name: ch.title,
      channel_handle: ch.handle,
      channel_thumbnail_url: ch.thumbnail,
      channel_description: ch.description,
      language: ch.language ?? "unknown",
    };

    let channelRowId: string;
    if (existing) {
      const diff = buildChannelDiff(existing as any, incoming);
      if (diff.length && !data.confirmOverwrite) {
        await flush((existing as any).id as string);
        return {
          needsConfirm: true as const,
          channelId: (existing as any).id as string,
          channelName: (existing as any).channel_name as string,
          diff,
        };
      }
      const patch: Record<string, unknown> = {
        active: true,
        category,
        last_synced_at: new Date().toISOString(),
      };
      for (const f of diff) patch[f.field] = f.incoming;
      const { error } = await context.supabase
        .from("whitelist_channels")
        .update(patch as never)
        .eq("id", (existing as any).id);
      if (error) throw new Error(error.message);
      channelRowId = (existing as any).id;
    } else {
      const { data: row, error } = await context.supabase
        .from("whitelist_channels")
        .insert({
          parent_user_id: context.userId,
          youtube_channel_id: ch.id,
          channel_name: ch.title,
          channel_handle: ch.handle,
          channel_thumbnail_url: ch.thumbnail,
          channel_description: ch.description?.trim() || null,
          category,
          active: true,
          language: ch.language ?? "unknown",
          last_synced_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      channelRowId = row.id;
    }


    let imported = 0;
    try {
      imported = await importVideosForChannel(
        context.supabase,
        context.userId,
        channelRowId,
        ch.uploadsPlaylistId,
        data.videoLimit,
      );
    } finally {
      await flush(channelRowId);
    }

    return { channelId: channelRowId, videosImported: imported, unitsUsed: meter.units };
  });

export const refreshChannelVideos = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({
      channelId: z.string().uuid(),
      videoLimit: z.number().int().min(1).max(500).default(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ch, error } = await context.supabase
      .from("whitelist_channels")
      .select("id, youtube_channel_id")
      .eq("id", data.channelId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ch) throw new Error("Channel not found");

    const { fetchChannel, withYtMeter } = await import("@/lib/youtube.server");
    const { recordUsage, logSyncRun } = await import("@/lib/api-usage.server");
    const startedAt = new Date().toISOString();
    // Channel metadata is only updated through previewChannelUpdate/applyChannelUpdate
    // so the parent always authorises the change.
    const { result: imported, meter } = await withYtMeter(async () => {
      const yt = await fetchChannel(ch.youtube_channel_id);
      return importVideosForChannel(
        context.supabase,
        context.userId,
        ch.id,
        yt.uploadsPlaylistId,
        data.videoLimit,
      );
    });
    await recordUsage(context.supabase, context.userId, meter, ch.id);
    await logSyncRun(context.supabase, context.userId, {
      source: "manual",
      startedAt,
      channelsProcessed: 1,
      videosImported: imported,
      unitsUsed: meter.units,
    });
    await context.supabase
      .from("whitelist_channels")
      .update({ last_synced_at: new Date().toISOString() } as never)
      .eq("id", ch.id);
    return { videosImported: imported, unitsUsed: meter.units };
  });

// ---------- bulk update ----------
/**
 * Update a single channel as part of a bulk run.
 * mode "review": metadata differences are stored as pending updates.
 * mode "auto": metadata differences are applied immediately.
 */
export const bulkUpdateChannel = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({
      channelId: z.string().uuid(),
      mode: z.enum(["review", "auto"]),
      videoLimit: z.number().int().min(1).max(500).default(200),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ch, error } = await context.supabase
      .from("whitelist_channels")
      .select("*")
      .eq("id", data.channelId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ch) throw new Error("Channel not found");

    const { fetchChannel, withYtMeter } = await import("@/lib/youtube.server");
    const { recordUsage } = await import("@/lib/api-usage.server");

    const { result, meter } = await withYtMeter(async () => {
      const yt = await fetchChannel((ch as any).youtube_channel_id);
      const incoming = {
        channel_name: yt.title,
        channel_handle: yt.handle,
        channel_thumbnail_url: yt.thumbnail,
        channel_description: yt.description,
        language: yt.language ?? "unknown",
      };
      const diff = buildChannelDiff(ch as any, incoming);
      const imported = await importVideosForChannel(
        context.supabase,
        context.userId,
        (ch as any).id,
        yt.uploadsPlaylistId,
        data.videoLimit,
      );
      return { diff, imported };
    });

    const patch: Record<string, unknown> = { last_synced_at: new Date().toISOString() };
    if (result.diff.length) {
      if (data.mode === "auto") {
        for (const f of result.diff) patch[f.field] = f.incoming;
        patch['pending_updates'] = null;
        patch['pending_updates_at'] = null;
      } else {
        patch['pending_updates'] = result.diff;
        patch['pending_updates_at'] = new Date().toISOString();
      }
    }
    const { error: upErr } = await context.supabase
      .from("whitelist_channels")
      .update(patch as never)
      .eq("id", (ch as any).id);
    if (upErr) throw new Error(upErr.message);

    await recordUsage(context.supabase, context.userId, meter, (ch as any).id);

    return {
      channelId: (ch as any).id as string,
      videosImported: result.imported,
      changedFields: result.diff.length,
      applied: data.mode === "auto" && result.diff.length > 0,
      unitsUsed: meter.units,
    };
  });

/** Persist a summary row for a completed bulk run. */
export const logBulkSyncRun = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) =>
    z.object({
      startedAt: z.string(),
      channelsProcessed: z.number().int().min(0),
      videosImported: z.number().int().min(0),
      unitsUsed: z.number().int().min(0),
      errors: z.array(z.object({ channel: z.string(), error: z.string() })).default([]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { logSyncRun } = await import("@/lib/api-usage.server");
    await logSyncRun(context.supabase, context.userId, {
      source: "bulk",
      startedAt: data.startedAt,
      channelsProcessed: data.channelsProcessed,
      videosImported: data.videosImported,
      unitsUsed: data.unitsUsed,
      errors: data.errors.length ? data.errors : null,
    });
    return { ok: true };
  });

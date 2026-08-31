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
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { fetchChannel, inferCategory } = await import("@/lib/youtube.server");
    const ch = await fetchChannel(data.url);
    const category = data.category ?? inferCategory({
      topicIds: ch.topicIds,
      title: ch.title,
      description: ch.description,
    });

    // Upsert channel
    const { data: existing } = await context.supabase
      .from("whitelist_channels")
      .select("id, language, channel_description")
      .eq("parent_user_id", context.userId)
      .eq("youtube_channel_id", ch.id)
      .maybeSingle();

    let channelRowId: string;
    if (existing) {
      const keepLang = existing.language && existing.language !== "unknown";
      const keepDesc = (existing as any).channel_description?.trim();
      const { error } = await context.supabase
        .from("whitelist_channels")
        .update({
          channel_name: ch.title,
          channel_handle: ch.handle,
          channel_thumbnail_url: ch.thumbnail,
          channel_description: keepDesc || ch.description?.trim() || null,
          category,
          active: true,
          language: keepLang ? existing.language : (ch.language ?? "unknown"),
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      channelRowId = existing.id;
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
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      channelRowId = row.id;
    }

    const imported = await importVideosForChannel(
      context.supabase,
      context.userId,
      channelRowId,
      ch.uploadsPlaylistId,
      data.videoLimit,
    );

    return { channelId: channelRowId, videosImported: imported };
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
      .select("id, youtube_channel_id, language, channel_description")
      .eq("id", data.channelId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ch) throw new Error("Channel not found");

    const { fetchChannel } = await import("@/lib/youtube.server");
    const yt = await fetchChannel(ch.youtube_channel_id);
    // Never overwrite a language / description the parent set manually.
    const patch: Record<string, unknown> = {};
    if (!ch.language || ch.language === "unknown") patch['language'] = yt.language ?? "unknown";
    if (!(ch as any).channel_description?.trim() && yt.description?.trim()) {
      patch['channel_description'] = yt.description.trim();
    }
    if (Object.keys(patch).length) {
      const { error: updErr } = await context.supabase
        .from("whitelist_channels")
        .update(patch)
        .eq("id", ch.id);
      if (updErr) throw new Error(updErr.message);
    }
    const imported = await importVideosForChannel(
      context.supabase,
      context.userId,
      ch.id,
      yt.uploadsPlaylistId,
      data.videoLimit,
    );
    return { videosImported: imported };
  });

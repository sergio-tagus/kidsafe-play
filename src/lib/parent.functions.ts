import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("child_profiles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- whitelist channels ----------
const CATEGORIES = ["cartoons", "education", "music", "science", "stories", "games", "arts", "sports"] as const;

export const listWhitelistChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("whitelist_channels")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const channelInput = z.object({
  id: z.string().uuid().optional(),
  youtube_channel_id: z.string().min(1).max(200),
  channel_name: z.string().min(1).max(200),
  channel_handle: z.string().max(200).nullable().optional(),
  channel_thumbnail_url: z.string().url().nullable().optional().or(z.literal("")),
  category: z.enum(CATEGORIES),
  active: z.boolean().default(true),
});

export const upsertWhitelistChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => channelInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      parent_user_id: context.userId,
      youtube_channel_id: data.youtube_channel_id,
      channel_name: data.channel_name,
      channel_handle: data.channel_handle || null,
      channel_thumbnail_url: data.channel_thumbnail_url || null,
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("whitelist_channels").delete().eq("id", data.id);
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
  .middleware([requireSupabaseAuth])
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("videos_cache").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

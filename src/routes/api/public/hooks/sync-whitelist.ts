import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, apikey, Authorization",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// Frequency thresholds in ms
const THRESHOLD: Record<string, number> = {
  daily: 20 * 60 * 60 * 1000,     // 20h
  weekly: 6 * 24 * 60 * 60 * 1000, // 6 days
  monthly: 28 * 24 * 60 * 60 * 1000,
};

export const Route = createFileRoute("/api/public/hooks/sync-whitelist")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        // Auth: require the anon apikey header (matches pg_cron config)
        const providedKey = request.headers.get("apikey");
        const expectedKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!providedKey || !expectedKey || providedKey !== expectedKey) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { fetchChannel, fetchRecentUploads } = await import("@/lib/youtube.server");

        const nowMs = Date.now();
        const { data: settings, error: sErr } = await supabaseAdmin
          .from("sync_settings")
          .select("parent_user_id, frequency, last_run_at")
          .neq("frequency", "off");
        if (sErr) return json({ error: sErr.message }, 500);

        const due = (settings ?? []).filter((s: any) => {
          const th = THRESHOLD[s.frequency];
          if (!th) return false;
          if (!s.last_run_at) return true;
          return nowMs - new Date(s.last_run_at).getTime() >= th;
        });

        let processedParents = 0;
        let processedChannels = 0;
        let importedVideos = 0;
        const errors: Array<{ parent: string; channel?: string; error: string }> = [];

        for (const s of due) {
          processedParents++;
          const { data: channels } = await supabaseAdmin
            .from("whitelist_channels")
            .select("id, youtube_channel_id")
            .eq("parent_user_id", s.parent_user_id)
            .eq("active", true);

          for (const ch of channels ?? []) {
            try {
              const yt = await fetchChannel(ch.youtube_channel_id);
              const videos = await fetchRecentUploads(yt.uploadsPlaylistId, 200);
              if (videos.length) {
                const rows = videos.map((v) => ({
                  parent_user_id: s.parent_user_id,
                  whitelist_channel_id: ch.id,
                  youtube_video_id: v.youtube_video_id,
                  title: v.title,
                  description: v.description || null,
                  thumbnail_url: v.thumbnail || `https://img.youtube.com/vi/${v.youtube_video_id}/hqdefault.jpg`,
                  duration_seconds: v.durationSeconds,
                  published_at: v.publishedAt,
                }));
                const { error: upErr } = await supabaseAdmin
                  .from("videos_cache")
                  .upsert(rows, { onConflict: "parent_user_id,youtube_video_id" });
                if (upErr) throw new Error(upErr.message);
                importedVideos += rows.length;
              }
              processedChannels++;
            } catch (e: any) {
              errors.push({ parent: s.parent_user_id, channel: ch.youtube_channel_id, error: String(e?.message ?? e) });
              console.error("[sync-whitelist] channel failed", ch.youtube_channel_id, e);
            }
          }

          await supabaseAdmin
            .from("sync_settings")
            .update({ last_run_at: new Date().toISOString() })
            .eq("parent_user_id", s.parent_user_id);
        }

        return json({
          ok: true,
          processedParents,
          processedChannels,
          importedVideos,
          errors,
        });
      },
    },
  },
});

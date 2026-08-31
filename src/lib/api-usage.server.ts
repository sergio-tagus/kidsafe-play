// Server-only helpers to persist YouTube API quota usage.
import type { YtMeter } from "@/lib/youtube.server";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Aggregate a metered run into `youtube_api_usage` (one row per day/operation/channel).
 * Never throws: accounting must not break the user-facing action.
 */
export async function recordUsage(
  supabase: any,
  parentUserId: string,
  meter: YtMeter,
  channelId: string | null = null,
): Promise<void> {
  try {
    const day = today();
    for (const [operation, v] of Object.entries(meter.byOp)) {
      if (!v.calls) continue;
      let q = supabase
        .from("youtube_api_usage")
        .select("id, units, calls")
        .eq("parent_user_id", parentUserId)
        .eq("day", day)
        .eq("operation", operation);
      q = channelId ? q.eq("whitelist_channel_id", channelId) : q.is("whitelist_channel_id", null);
      const { data: existing } = await q.maybeSingle();
      if (existing) {
        await supabase
          .from("youtube_api_usage")
          .update({ units: (existing.units ?? 0) + v.units, calls: (existing.calls ?? 0) + v.calls })
          .eq("id", existing.id);
      } else {
        await supabase.from("youtube_api_usage").insert({
          parent_user_id: parentUserId,
          day,
          operation,
          units: v.units,
          calls: v.calls,
          whitelist_channel_id: channelId,
        });
      }
    }
  } catch (e) {
    console.error("[api-usage] failed to record usage", e);
  }
}

/** Log a completed sync run (manual, bulk or cron). */
export async function logSyncRun(
  supabase: any,
  parentUserId: string,
  run: {
    source: "manual" | "bulk" | "cron";
    startedAt: string;
    channelsProcessed: number;
    videosImported: number;
    unitsUsed: number;
    errors?: unknown;
  },
): Promise<void> {
  try {
    await supabase.from("youtube_sync_runs").insert({
      parent_user_id: parentUserId,
      source: run.source,
      started_at: run.startedAt,
      finished_at: new Date().toISOString(),
      channels_processed: run.channelsProcessed,
      videos_imported: run.videosImported,
      units_used: run.unitsUsed,
      errors: run.errors ?? null,
    });
  } catch (e) {
    console.error("[api-usage] failed to log sync run", e);
  }
}

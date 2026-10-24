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
      const { error } = await supabase.rpc("increment_youtube_usage", {
        _parent: parentUserId,
        _day: day,
        _operation: operation,
        _channel: channelId,
        _units: v.units,
        _calls: v.calls,
      });
      if (error) console.error("[api-usage] failed to record usage", error);
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

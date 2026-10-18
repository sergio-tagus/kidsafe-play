/** Seconds the "Next video" card waits before playing the suggestion. */
export const AUTOPLAY_NEXT_SECONDS = 10;

/** The suggested next video: first related video that isn't the current one. */
export function pickNextVideo<T extends { youtube_video_id: string }>(related: T[], currentId: string): T | null {
  return related.find((r) => r.youtube_video_id !== currentId) ?? null;
}

/** Clamp a seek target within [0, duration]. */
export function seekTarget(current: number, delta: number, duration: number): number {
  return Math.min(duration > 0 ? duration : Infinity, Math.max(0, current + delta));
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? h + ":" : ""}${mm}:${String(r).padStart(2, "0")}`;
}

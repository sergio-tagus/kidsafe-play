/** True when a YouTube /videos item is a live stream (current, upcoming or a past live recording). */
export function isLiveVideo(v: any): boolean {
  const lbc = v?.snippet?.liveBroadcastContent;
  if (lbc === "live" || lbc === "upcoming") return true;
  if (v?.liveStreamingDetails) return true;
  const d = v?.contentDetails?.duration;
  if (!d || d === "P0D" || d === "PT0S") return true;
  return false;
}

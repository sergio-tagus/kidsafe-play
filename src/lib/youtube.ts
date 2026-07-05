export function parseYouTubeChannel(input: string): { id?: string; handle?: string } {
  const s = input.trim();
  if (!s) return {};
  // Direct channel ID (UC...)
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(s)) return { id: s };
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) return { id: parts[1] };
    if (parts[0]?.startsWith("@")) return { handle: parts[0].slice(1) };
    if (parts[0] === "c" && parts[1]) return { handle: parts[1] };
    if (parts[0] === "user" && parts[1]) return { handle: parts[1] };
  } catch {
    // fallthrough
  }
  if (s.startsWith("@")) return { handle: s.slice(1) };
  return { handle: s };
}

export function parseYouTubeVideo(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const v = url.searchParams.get("v");
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    if (url.hostname.includes("youtu.be") && parts[0]) return parts[0];
    if ((parts[0] === "shorts" || parts[0] === "embed" || parts[0] === "live") && parts[1]) return parts[1];
  } catch {
    // fallthrough
  }
  return null;
}

export function youtubeThumb(videoId: string, quality: "default" | "hq" | "mq" = "hq") {
  const q = quality === "hq" ? "hqdefault" : quality === "mq" ? "mqdefault" : "default";
  return `https://img.youtube.com/vi/${videoId}/${q}.jpg`;
}

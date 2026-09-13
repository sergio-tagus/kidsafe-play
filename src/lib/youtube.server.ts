// Server-only YouTube Data API v3 client.
// NOTE: this file is imported ONLY from inside .handler() bodies of createServerFn
// (indirectly via helpers used there). We still use the .server.ts suffix to make
// leaks explicit.

const API_BASE = "https://www.googleapis.com/youtube/v3";

function key() {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k) throw new Error("YOUTUBE_API_KEY is not configured");
  return k;
}

// ---------- Quota metering ----------
// Official YouTube Data API v3 costs (units per call).
const OPERATION_COST: Record<string, number> = {
  "/search": 100,
  "/channels": 1,
  "/playlistItems": 1,
  "/videos": 1,
};

export type YtMeter = {
  units: number;
  calls: number;
  byOp: Record<string, { units: number; calls: number }>;
};

export function createMeter(): YtMeter {
  return { units: 0, calls: 0, byOp: {} };
}

let activeMeter: YtMeter | null = null;

/** Install a meter for subsequent calls; returns a function that restores the previous one. */
export function setActiveMeter(meter: YtMeter): () => void {
  const prev = activeMeter;
  activeMeter = meter;
  let done = false;
  return () => {
    if (done) return;
    done = true;
    activeMeter = prev;
  };
}

/** Run `fn` while counting every YouTube API call it performs. */
export async function withYtMeter<T>(fn: (meter: YtMeter) => Promise<T>): Promise<{ result: T; meter: YtMeter }> {
  const meter = createMeter();
  const prev = activeMeter;
  activeMeter = meter;
  try {
    const result = await fn(meter);
    return { result, meter };
  } finally {
    activeMeter = prev;
  }
}

function meterCall(path: string) {
  if (!activeMeter) return;
  const op = path.replace(/^\//, "");
  const units = OPERATION_COST[path] ?? 1;
  activeMeter.units += units;
  activeMeter.calls += 1;
  const cur = activeMeter.byOp[op] ?? { units: 0, calls: 0 };
  cur.units += units;
  cur.calls += 1;
  activeMeter.byOp[op] = cur;
}

async function ytFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  url.searchParams.set("key", key());
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, String(v));
  meterCall(path);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    let msg = `YouTube API ${res.status}`;
    try {
      const j = JSON.parse(body);
      const reason = j?.error?.errors?.[0]?.reason || "";
      const detail = j?.error?.message || "";
      msg = reason === "quotaExceeded"
        ? "YouTube daily quota exceeded. Try again tomorrow."
        : reason === "keyInvalid" || reason === "forbidden"
          ? "Invalid or restricted YouTube API key."
          : `${msg}: ${detail || reason || body.slice(0, 200)}`;
    } catch {
      msg = `${msg}: ${body.slice(0, 200)}`;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

// ---------- URL / handle parsing ----------
function parseChannelInput(raw: string): { id?: string; handle?: string; videoId?: string; query?: string } {
  const s = raw.trim();
  if (!s) return {};
  if (/^UC[a-zA-Z0-9_-]{20,}$/.test(s)) return { id: s };
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "channel" && parts[1]) return { id: parts[1] };
    if (parts[0]?.startsWith("@")) return { handle: parts[0].slice(1) };
    if (parts[0] === "c" && parts[1]) return { handle: parts[1] };
    if (parts[0] === "user" && parts[1]) return { handle: parts[1] };
    if (parts[0] === "watch") {
      const v = url.searchParams.get("v");
      if (v) return { videoId: v };
    }
    if ((parts[0] === "shorts" || parts[0] === "live" || parts[0] === "embed") && parts[1]) {
      return { videoId: parts[1] };
    }
    if (url.hostname.replace(/^www\./, "") === "youtu.be" && parts[0]) return { videoId: parts[0] };
  } catch {
    // fallthrough
  }
  if (s.startsWith("@")) return { handle: s.slice(1) };
  return { handle: s };
}

// ---------- Types ----------
export type YtChannel = {
  id: string;
  title: string;
  handle: string | null;
  description: string;
  thumbnail: string | null;
  uploadsPlaylistId: string;
  topicIds: string[];
  subscriberCount: number;
  videoCount: number;
  language: string | null;
};

export type YtVideo = {
  youtube_video_id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
  categoryId: string | null;
};

// ---------- Channel lookup ----------
export async function fetchChannel(input: string): Promise<YtChannel> {
  const parsed = parseChannelInput(input);

  let raw: any | null = null;

  if (parsed.id) {
    const j = await ytFetch<any>("/channels", {
      part: "snippet,contentDetails,topicDetails,statistics,brandingSettings",
      id: parsed.id,
    });
    raw = j.items?.[0] ?? null;
  }

  if (!raw && parsed.videoId) {
    // A video/short URL: resolve its owning channel first.
    const v = await ytFetch<any>("/videos", { part: "snippet", id: parsed.videoId });
    const chId = v.items?.[0]?.snippet?.channelId;
    if (chId) {
      const j = await ytFetch<any>("/channels", {
        part: "snippet,contentDetails,topicDetails,statistics,brandingSettings",
        id: chId,
      });
      raw = j.items?.[0] ?? null;
    }
  }

  const searchTerm = parsed.handle ?? parsed.query;
  if (!raw && searchTerm) {
    // Try forHandle (newer API), then forUsername (legacy)
    const j1 = await ytFetch<any>("/channels", {
      part: "snippet,contentDetails,topicDetails,statistics,brandingSettings",
      forHandle: searchTerm,
    }).catch(() => ({ items: [] }));
    raw = j1.items?.[0] ?? null;
    if (!raw) {
      const j2 = await ytFetch<any>("/channels", {
        part: "snippet,contentDetails,topicDetails,statistics,brandingSettings",
        forUsername: searchTerm,
      }).catch(() => ({ items: [] }));
      raw = j2.items?.[0] ?? null;
    }
    if (!raw) {
      // Last resort: search endpoint
      const s = await ytFetch<any>("/search", {
        part: "snippet",
        type: "channel",
        q: searchTerm,
        maxResults: 1,
      });
      const chId = s.items?.[0]?.id?.channelId;
      if (chId) {
        const j3 = await ytFetch<any>("/channels", {
          part: "snippet,contentDetails,topicDetails,statistics,brandingSettings",
          id: chId,
        });
        raw = j3.items?.[0] ?? null;
      }
    }
  }

  if (!raw) {
    throw new Error(
      `Channel not found on YouTube for "${input.trim().slice(0, 120)}". Paste the channel URL (youtube.com/@handle or /channel/UC...).`,
    );
  }


  const uploads = raw.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) throw new Error("Channel has no uploads playlist");

  const thumb =
    raw.snippet?.thumbnails?.high?.url ||
    raw.snippet?.thumbnails?.medium?.url ||
    raw.snippet?.thumbnails?.default?.url ||
    null;

  return {
    id: raw.id,
    title: raw.snippet?.title ?? "Untitled",
    handle: raw.snippet?.customUrl ? String(raw.snippet.customUrl).replace(/^@/, "") : null,
    description: raw.snippet?.description ?? "",
    thumbnail: thumb,
    uploadsPlaylistId: uploads,
    topicIds: raw.topicDetails?.topicIds ?? [],
    subscriberCount: Number(raw.statistics?.subscriberCount ?? 0),
    videoCount: Number(raw.statistics?.videoCount ?? 0),
    language: normalizeLanguage(
      raw.brandingSettings?.channel?.defaultLanguage ??
        raw.snippet?.defaultLanguage ??
        countryToLanguage(raw.snippet?.country ?? raw.brandingSettings?.channel?.country),
    ),
  };
}

// ---------- Uploads ----------
function parseIsoDuration(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(s);
  if (!m) return null;
  const [, h, mi, se] = m;
  return (Number(h ?? 0) * 3600) + (Number(mi ?? 0) * 60) + Number(se ?? 0);
}

export async function fetchRecentUploads(uploadsPlaylistId: string, max = 200): Promise<YtVideo[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  while (ids.length < max) {
    const page: any = await ytFetch("/playlistItems", {
      part: "contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of page.items ?? []) {
      const vid = item?.contentDetails?.videoId;
      if (vid) ids.push(vid);
      if (ids.length >= max) break;
    }
    pageToken = page.nextPageToken;
    if (!pageToken) break;
  }

  if (!ids.length) return [];

  const out: YtVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const j: any = await ytFetch("/videos", {
      part: "snippet,contentDetails",
      id: chunk.join(","),
      maxResults: 50,
    });
    for (const v of j.items ?? []) {
      const sn = v.snippet ?? {};
      const th = sn.thumbnails ?? {};
      out.push({
        youtube_video_id: v.id,
        title: sn.title ?? "Untitled",
        description: sn.description ?? "",
        thumbnail: th.high?.url || th.medium?.url || th.default?.url || null,
        publishedAt: sn.publishedAt ?? null,
        durationSeconds: parseIsoDuration(v.contentDetails?.duration),
        categoryId: sn.categoryId ?? null,
      });
    }
  }
  return out;
}

// ---------- Category inference ----------
type Category = "cartoons" | "education" | "music" | "science" | "stories" | "games" | "arts" | "sports";

// Freebase topic IDs used by YouTube topicDetails.
// See https://developers.google.com/youtube/v3/docs/search/list#topicId
const TOPIC_MAP: Record<string, Category> = {
  "/m/04rlf": "music",
  "/m/02mscn": "music",
  "/m/0ggq0m": "music",
  "/m/01lyv": "music",
  "/m/06by7": "music",
  "/m/0y4f8": "music",
  "/m/06ntj": "sports",
  "/m/0jm_": "sports",
  "/m/018jz": "sports",
  "/m/09xp_": "sports",
  "/m/02vx4": "sports",
  "/m/0bzvm2": "games",
  "/m/025zzc": "games",
  "/m/02ntfj": "games",
  "/m/0b1vjn": "games",
  "/m/01k8wb": "education",
  "/m/098wr": "education",
  "/m/06bvp": "education",
  "/m/07c1v": "science",
  "/m/07bxq": "arts",
  "/m/05qjc": "arts",
  "/m/0f2f9": "arts",
  "/m/09kqc": "cartoons", // Lifestyle-ish but many kid-toon channels tag this
  "/m/02jjt": "cartoons", // Entertainment
  "/m/095bb": "cartoons", // Animated cartoon
  "/m/02vxn": "cartoons", // Film
};

// YouTube videoCategoryId (US) mapping
const VIDEO_CAT_MAP: Record<string, Category> = {
  "1": "cartoons", // Film & Animation
  "10": "music",
  "15": "cartoons", // Pets & Animals -> often kid content
  "17": "sports",
  "19": "stories", // Travel & Events
  "20": "games", // Gaming
  "22": "stories", // People & Blogs
  "23": "stories", // Comedy
  "24": "cartoons", // Entertainment
  "25": "education", // News & Politics
  "26": "education", // How-to & Style
  "27": "education",
  "28": "science",
  "29": "education", // Nonprofits & Activism
};

const KEYWORD_MAP: Array<[RegExp, Category]> = [
  [/\b(cartoon|dibujos?|desenho|animation|anim[eé])\b/i, "cartoons"],
  [/\b(music|m[uú]sica|song|canci[oó]n|nursery rhyme|cancion)\b/i, "music"],
  [/\b(science|ciencia|experiment|physics|chemistry|biolog[iy]a)\b/i, "science"],
  [/\b(story|stories|cuento|hist[oó]ria|tale|fabl?e)\b/i, "stories"],
  [/\b(game|gaming|videojuego|minecraft|roblox|jogo)\b/i, "games"],
  [/\b(art|arte|craft|paint|dibujo|manualidades)\b/i, "arts"],
  [/\b(sport|deporte|f[uú]tbol|soccer|basketball|baloncesto)\b/i, "sports"],
  [/\b(learn|aprend|educa|school|escuela|escola|abc|123|math|matem)\b/i, "education"],
];

export function inferCategory(input: {
  topicIds?: string[];
  videoCategoryIds?: (string | null | undefined)[];
  title?: string;
  description?: string;
}): Category {
  const votes = new Map<Category, number>();
  const bump = (c: Category, w: number) => votes.set(c, (votes.get(c) ?? 0) + w);

  for (const t of input.topicIds ?? []) {
    const c = TOPIC_MAP[t];
    if (c) bump(c, 3);
  }
  for (const v of input.videoCategoryIds ?? []) {
    if (!v) continue;
    const c = VIDEO_CAT_MAP[v];
    if (c) bump(c, 1);
  }
  const text = `${input.title ?? ""}\n${input.description ?? ""}`;
  for (const [re, cat] of KEYWORD_MAP) if (re.test(text)) bump(cat, 2);

  let best: Category = "education";
  let bestScore = -1;
  for (const [c, s] of votes) {
    if (s > bestScore) {
      best = c;
      bestScore = s;
    }
  }
  return best;
}

// ---------- Language helpers ----------
const COUNTRY_LANG: Record<string, string> = {
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es", VE: "es", UY: "es", EC: "es",
  BO: "es", PY: "es", CR: "es", PA: "es", GT: "es", HN: "es", SV: "es", NI: "es", DO: "es", CU: "es",
  US: "en", GB: "en", AU: "en", CA: "en", IE: "en", NZ: "en", ZA: "en", IN: "en", PH: "en",
  PT: "pt", BR: "pt", AO: "pt", MZ: "pt",
  FR: "fr", BE: "fr", DE: "de", AT: "de", CH: "de", IT: "it", NL: "nl", RU: "ru", UA: "ru",
  JP: "ja", KR: "ko", CN: "zh", TW: "zh", HK: "zh", SA: "ar", AE: "ar", EG: "ar", MA: "ar",
};

export function countryToLanguage(country: unknown): string | null {
  if (typeof country !== "string" || !country.trim()) return null;
  return COUNTRY_LANG[country.trim().toUpperCase()] ?? null;
}

export function normalizeLanguage(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return base && base !== "zxx" ? base : "unknown";
}

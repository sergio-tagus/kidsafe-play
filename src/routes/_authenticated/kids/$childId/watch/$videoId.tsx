import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listChildProfiles } from "@/lib/parent.functions";
import { getSafeVideo, listSafeVideos, toggleFavorite, isFavorite, recordWatchTick, checkScreenTime } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Heart, Lock, Play, Pause, RotateCcw, RotateCw, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";

function sanitizeDescription(text: string): string {
  if (!text) return "";
  return text
    // strip full URLs
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    // strip bare youtube/social domains
    .replace(/\b(?:youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com)\S*/gi, "")
    // strip @handles
    .replace(/(^|\s)@[\w.\-]+/g, "$1")
    // strip common "subscribe" lines
    .replace(/^.*(?:suscr[íi]bete|subscribe|sígueme|follow me|redes sociales|social media).*$/gim, "")
    // collapse whitespace
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const Route = createFileRoute("/_authenticated/kids/$childId/watch/$videoId")({
  component: WatchPage,
});

const SEEK_SECONDS = 10;

// Load YouTube IFrame API once
let ytPromise: Promise<any> | null = null;
function loadYT(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject();
  if ((window as any).YT?.Player) return Promise.resolve((window as any).YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => resolve((window as any).YT);
  });
  return ytPromise;
}

function WatchPage() {
  const { childId, videoId } = Route.useParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const kidsFn = useServerFn(listChildProfiles);
  const videoFn = useServerFn(getSafeVideo);
  const relatedFn = useServerFn(listSafeVideos);
  const favFn = useServerFn(toggleFavorite);
  const isFavFn = useServerFn(isFavorite);
  const tickFn = useServerFn(recordWatchTick);
  const checkFn = useServerFn(checkScreenTime);

  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;

  const { data: video, isLoading } = useQuery({
    queryKey: ["video", childId, videoId],
    queryFn: () => videoFn({ data: { childId, videoId } }),
  });
  const { data: related = [] } = useQuery({
    queryKey: ["related", childId, video?.channel.id],
    queryFn: () => relatedFn({ data: { childId, filter: "byChannel", channelId: video!.channel.id, limit: 12 } }),
    enabled: !!video,
  });
  const { data: fav, refetch: refetchFav } = useQuery({
    queryKey: ["fav", childId, videoId],
    queryFn: () => isFavFn({ data: { childId, videoId } }),
  });
  const { data: screen, refetch: refetchScreen } = useQuery({
    queryKey: ["screen", childId],
    queryFn: () => checkFn({ data: { childId } }),
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const heartbeatRef = useRef<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!video) return;
    if (screen && !screen.allowed) {
      setLocked(true);
      return;
    }
    let mounted = true;
    loadYT().then((YT) => {
      if (!mounted || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId: video.youtube_video_id,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 1,
          disablekb: 1,
          // Use our own fullscreen (on the wrapper) so the custom controls and
          // the pause overlay stay visible instead of being hidden by the iframe.
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          autoplay: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            try {
              const iframe = containerRef.current?.tagName === "IFRAME"
                ? (containerRef.current as unknown as HTMLIFrameElement)
                : (playerRef.current?.getIframe?.() as HTMLIFrameElement | undefined);
              iframe?.setAttribute("tabindex", "-1");
              // Block AirPlay / Chromecast / remote playback on the iframe and any
              // inner <video> element the browser may expose.
              iframe?.setAttribute("disableRemotePlayback", "true");
              iframe?.setAttribute("x-webkit-airplay", "deny");
              iframe?.setAttribute("controlsList", "nodownload noremoteplayback noplaybackrate");
              iframe?.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
            } catch { /* ignore */ }
          },
          onStateChange: (e: any) => {
            const p = playerRef.current;
            if (e.data === YT.PlayerState.PLAYING) {
              setPaused(false);
              if (heartbeatRef.current) return;
              heartbeatRef.current = window.setInterval(async () => {
                try {
                  const current = Math.floor(p.getCurrentTime?.() ?? 0);
                  const total = Math.floor(p.getDuration?.() ?? 0);
                  await tickFn({
                    data: {
                      childId,
                      videoId: video.youtube_video_id,
                      progressSeconds: current,
                      totalSeconds: total || undefined,
                      deltaSeconds: 15,
                    },
                  });
                  const s = await checkFn({ data: { childId } });
                  if (!s.allowed) {
                    p.pauseVideo();
                    setLocked(true);
                    if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
                    refetchScreen();
                  }
                } catch {
                  // ignore
                }
              }, 15000);
            } else {
              // Anything that isn't PLAYING (PAUSED, ENDED, BUFFERING, CUED, UNSTARTED)
              // triggers the block overlay to preempt YouTube's end-screen flash.
              setPaused(true);
              if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
            }
          },
        },
      });
    });
    return () => {
      mounted = false;
      if (heartbeatRef.current) { clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      try { playerRef.current?.destroy?.(); } catch { /* ignore */ }
      playerRef.current = null;
    };
  }, [video, childId, tickFn, checkFn, refetchScreen, screen]);

  const remaining = useMemo(() => screen?.remaining ?? 0, [screen]);

  const seekBy = useCallback((delta: number) => {
    try {
      const p = playerRef.current;
      if (!p?.seekTo) return;
      const current = p.getCurrentTime?.() ?? 0;
      const total = p.getDuration?.() ?? 0;
      const next = Math.min(total > 0 ? total : Infinity, Math.max(0, current + delta));
      p.seekTo(next, true);
    } catch { /* ignore */ }
  }, []);

  const togglePlay = useCallback(() => {
    try {
      const p = playerRef.current;
      if (!p) return;
      if (p.getPlayerState?.() === 1) p.pauseVideo?.();
      else { p.playVideo?.(); setPaused(false); }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); seekBy(-SEEK_SECONDS); }
      else if (e.key === "ArrowRight") { e.preventDefault(); seekBy(SEEK_SECONDS); }
      else if (e.key === " " || e.key === "Enter") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, seekBy, togglePlay]);

  const toggleFullscreen = useCallback(async () => {
    try {
      const el = stageRef.current;
      if (!el) return;
      if (document.fullscreenElement) await document.exitFullscreen();
      else await (el.requestFullscreen?.() ?? (el as any).webkitRequestFullscreen?.());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const seekControls = (variant: "bar" | "overlay") => (
    <div className={`flex items-center justify-center gap-3 ${variant === "bar" ? "mt-3" : ""}`}>
      <Button
        size="lg"
        variant={variant === "overlay" ? "secondary" : "outline"}
        className="rounded-full h-14 px-6 text-base font-semibold shadow-lg"
        aria-label={t("player.rewind", { s: SEEK_SECONDS })}
        onClick={() => seekBy(-SEEK_SECONDS)}
      >
        <RotateCcw className="w-6 h-6 mr-2" /> {SEEK_SECONDS}s
      </Button>
      <Button
        size="lg"
        className="rounded-full h-16 w-16 p-0 shadow-lg"
        aria-label={t("player.playPause")}
        onClick={togglePlay}
      >
        {paused ? <Play className="w-7 h-7" /> : <Pause className="w-7 h-7" />}
      </Button>
      <Button
        size="lg"
        variant={variant === "overlay" ? "secondary" : "outline"}
        className="rounded-full h-14 px-6 text-base font-semibold shadow-lg"
        aria-label={t("player.forward", { s: SEEK_SECONDS })}
        onClick={() => seekBy(SEEK_SECONDS)}
      >
        {SEEK_SECONDS}s <RotateCw className="w-6 h-6 ml-2" />
      </Button>
      <Button
        size="lg"
        variant={variant === "overlay" ? "secondary" : "outline"}
        className="rounded-full h-14 w-14 p-0 shadow-lg"
        aria-label={isFullscreen ? t("player.exitFullscreen") : t("player.fullscreen")}
        onClick={toggleFullscreen}
      >
        {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
      </Button>
    </div>
  );



  return (
    <KidShell childId={childId} child={child}>
      {isLoading ? (
        <div className="text-center py-20 text-muted-foreground">{t("common.loading")}</div>
      ) : !video ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-3">🚫</div>
          <h2 className="text-xl font-display font-bold">Not available</h2>
          <Button className="mt-4 rounded-full" onClick={() => navigate({ to: "/kids/$childId", params: { childId } as any })}>{t("common.back")}</Button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div
            className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl"
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {!locked ? (
              <>
                <div ref={containerRef} className="w-full h-full" />
                {/* Top-left: block title + channel avatar (both link to YouTube).
                    Right third is left free for volume / CC / settings icons. */}
                <div
                  className="absolute top-0 left-0 h-16 right-1/3 z-10 cursor-pointer"
                  aria-hidden="true"
                  onClick={() => {
                    try {
                      const p = playerRef.current;
                      if (!p) return;
                      const state = p.getPlayerState?.();
                      if (state === 1) p.pauseVideo?.(); else p.playVideo?.();
                    } catch { /* ignore */ }
                  }}
                />
                {/* Bottom strip: covers Share/Link icon, "More videos" pill and
                    YouTube wordmark. The progress bar, time and fullscreen
                    button sit above this strip and remain interactive. */}
                <div
                  className="absolute bottom-0 inset-x-0 h-14 z-10"
                  aria-hidden="true"
                  onClick={(e) => e.stopPropagation()}
                />
                {/* Always-mounted overlay that covers YouTube's end-screen /
                    pause overlay to prevent the click-through flash. */}
                <div
                  className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-white transition-opacity ${
                    paused ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                  }`}
                >
                  <h2 className="text-2xl font-display font-bold [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]">{t("player.paused")}</h2>
                  {seekControls("overlay")}
                  <Button
                    size="lg"
                    className="rounded-full shadow-lg"
                    onClick={() => {
                      try { playerRef.current?.playVideo?.(); } catch { /* ignore */ }
                      setPaused(false);
                    }}
                  >
                    <Play className="w-5 h-5 mr-2" /> {t("player.resume")}
                  </Button>
                  <Button
                    variant="secondary"
                    className="rounded-full shadow-lg"
                    onClick={() => navigate({ to: "/kids/$childId", params: { childId } as any })}
                  >
                    {t("common.back")}
                  </Button>
                </div>

              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center gradient-warm">
                <Lock className="w-16 h-16 mb-4" />
                <h2 className="text-3xl font-display font-bold">{t("player.locked")}</h2>
                <p className="mt-2 opacity-90">{t("player.lockedDesc")}</p>
              </div>
            )}
          </div>
          {!locked && seekControls("bar")}

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-display font-bold">{video.title}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{video.channel.channel_name}</div>
              {video.description && (() => {
                const clean = sanitizeDescription(video.description);
                return clean ? <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">{clean}</p> : null;
              })()}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant={fav?.favorited ? "default" : "outline"}
                className="rounded-full"
                onClick={async () => {
                  const r = await favFn({ data: { childId, videoId } });
                  toast.success(r.favorited ? "❤️" : "");
                  refetchFav();
                }}
              >
                <Heart className={`w-4 h-4 mr-1 ${fav?.favorited ? "fill-current" : ""}`} /> {t("player.favorite")}
              </Button>
              {screen && (
                <div className="text-xs text-muted-foreground">{t("player.remaining", { min: Math.max(0, Math.round(remaining)) })}</div>
              )}
            </div>
          </div>
          {related.length > 1 && (
            <section className="mt-8">
              <h2 className="text-lg font-display font-bold mb-3">{t("player.upNext")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {related.filter((r) => r.youtube_video_id !== videoId).map((r) => (
                  <VideoCard key={r.id} video={r} childId={childId} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </KidShell>
  );
}

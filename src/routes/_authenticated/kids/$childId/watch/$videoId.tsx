import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { listChildProfiles } from "@/lib/parent.functions";
import { getSafeVideo, listSafeVideos, toggleFavorite, isFavorite, recordWatchTick, checkScreenTime } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Heart, Lock, Play } from "lucide-react";
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
  const playerRef = useRef<any>(null);
  const heartbeatRef = useRef<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [paused, setPaused] = useState(false);

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
          fs: 1,
          iv_load_policy: 3,
          playsinline: 1,
          autoplay: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
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
              if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.ENDED) {
                setPaused(true);
              }
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
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
            {!locked ? (
              <>
                <div ref={containerRef} className="w-full h-full pointer-events-auto" />
                {/* Block clicks on YouTube title bar (top) */}
                <div className="absolute top-0 left-0 right-0 h-16 z-10" aria-hidden="true" />
                {/* Block clicks on YouTube logo (bottom-right, above the control bar) */}
                <div className="absolute bottom-10 right-0 w-24 h-10 z-10" aria-hidden="true" />
                {paused && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm text-white">
                    <h2 className="text-2xl font-display font-bold">{t("player.paused")}</h2>
                    <Button
                      size="lg"
                      className="rounded-full"
                      onClick={() => {
                        try { playerRef.current?.playVideo?.(); } catch { /* ignore */ }
                        setPaused(false);
                      }}
                    >
                      <Play className="w-5 h-5 mr-2" /> {t("player.resume")}
                    </Button>
                    <Button
                      variant="outline"
                      className="rounded-full bg-transparent text-white border-white hover:bg-white/10 hover:text-white"
                      onClick={() => navigate({ to: "/kids/$childId", params: { childId } as any })}
                    >
                      {t("common.back")}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center gradient-warm">
                <Lock className="w-16 h-16 mb-4" />
                <h2 className="text-3xl font-display font-bold">{t("player.locked")}</h2>
                <p className="mt-2 opacity-90">{t("player.lockedDesc")}</p>
              </div>
            )}
          </div>
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

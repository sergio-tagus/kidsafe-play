import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo } from "react";
import { Heart, Lock, Play } from "lucide-react";
import { toast } from "sonner";

import { listChildProfiles } from "@/lib/parent.functions";
import {
  getSafeVideo,
  listSafeVideos,
  toggleFavorite,
  isFavorite,
  recordWatchTick,
  checkScreenTime,
} from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { useOnline } from "@/components/offline-banner";
import { VideoCard } from "@/components/video-card";
import { PlayerControls } from "@/components/player-controls";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { qk } from "@/lib/query-keys";
import { sanitizeDescription } from "@/lib/sanitize";
import { SEEK_SECONDS, useElementFullscreen, useYouTubePlayer } from "@/hooks/use-youtube-player";

export const Route = createFileRoute("/_authenticated/kids/$childId/watch/$videoId")({
  component: WatchPage,
});

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

  const online = useOnline();
  const { data: kids = [] } = useQuery({ queryKey: qk.kids(), queryFn: () => kidsFn() });
  const child = kids.find((k) => k.id === childId) ?? null;

  const { data: video, isLoading } = useQuery({
    queryKey: qk.video(childId, videoId),
    queryFn: () => videoFn({ data: { childId, videoId } }),
  });
  const { data: related = [] } = useQuery({
    queryKey: qk.related(childId, video?.channel.id),
    queryFn: () => relatedFn({ data: { childId, filter: "byChannel", channelId: video!.channel.id, limit: 12 } }),
    enabled: !!video,
  });
  const { data: fav, refetch: refetchFav } = useQuery({
    queryKey: qk.isFavorite(childId, videoId),
    queryFn: () => isFavFn({ data: { childId, videoId } }),
  });
  const { data: screen, refetch: refetchScreen } = useQuery({
    queryKey: qk.screenTime(childId),
    queryFn: () => checkFn({ data: { childId } }),
  });

  const outOfTime = !!screen && !screen.allowed;

  const onHeartbeat = useCallback(
    async ({ currentSeconds, totalSeconds }: { currentSeconds: number; totalSeconds: number }) => {
      if (!video) return true;
      await tickFn({
        data: {
          childId,
          videoId: video.youtube_video_id,
          progressSeconds: currentSeconds,
          totalSeconds: totalSeconds || undefined,
          deltaSeconds: 15,
        },
      });
      const s = await checkFn({ data: { childId } });
      if (!s.allowed) {
        void refetchScreen();
        return false;
      }
      return true;
    },
    [video, childId, tickFn, checkFn, refetchScreen],
  );

  const { containerRef, paused, blocked, seekBy, togglePlay, play } = useYouTubePlayer({
    videoId: video?.youtube_video_id ?? null,
    disabled: outOfTime || !online,
    onHeartbeat,
  });

  const locked = outOfTime || blocked;
  const {
    ref: stageRef,
    isFullscreen,
    isSimulatedFullscreen,
    toggle: toggleFullscreen,
  } = useElementFullscreen<HTMLDivElement>();


  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekBy(-SEEK_SECONDS);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        seekBy(SEEK_SECONDS);
      } else if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, seekBy, togglePlay]);

  const remaining = useMemo(() => screen?.remaining ?? 0, [screen]);
  const goHome = () => navigate({ to: "/kids/$childId", params: { childId } });
  const description = video?.description ? sanitizeDescription(video.description) : "";

  return (
    <KidShell childId={childId} child={child}>
      {isLoading ? (
        <div className="max-w-6xl mx-auto animate-pulse">
          <div className="aspect-video rounded-2xl bg-muted" />
          <div className="mt-4 h-6 w-2/3 rounded-full bg-muted" />
          <div className="mt-2 h-4 w-1/3 rounded-full bg-muted" />
        </div>
      ) : !video ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-3" aria-hidden="true">
            🚫
          </div>
          <h2 className="text-xl font-display font-bold">{t("common.notAvailable")}</h2>
          <Button className="mt-4 rounded-full" onClick={goHome}>
            {t("common.back")}
          </Button>
        </div>
      ) : !online ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-3" aria-hidden="true">
            📡
          </div>
          <h2 className="text-xl font-display font-bold">{t("offline.needsInternet")}</h2>
          <Button className="mt-4 rounded-full" onClick={goHome}>
            {t("common.back")}
          </Button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto">
          <div
            ref={stageRef}
            className={isFullscreen ? "bg-black flex flex-col items-center justify-center gap-4 w-full h-full p-4" : ""}
          >
            <div
              className={`relative rounded-2xl overflow-hidden bg-black shadow-2xl ${
                isFullscreen ? "w-full max-w-[min(100%,calc((100vh-11rem)*16/9))] aspect-video" : "aspect-video"
              }`}
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            >
              {!locked ? (
                <>
                  <div ref={containerRef} className="w-full h-full" />
                  {/* Top-left: blocks the YouTube title + channel avatar links.
                      The right third stays free for volume / CC / settings. */}
                  <div
                    className="absolute top-0 left-0 h-16 right-1/3 z-10 cursor-pointer"
                    aria-hidden="true"
                    onClick={togglePlay}
                  />
                  {/* Bottom strip: covers Share/Link, "More videos" and the wordmark. */}
                  <div className="absolute bottom-0 inset-x-0 h-14 z-10" aria-hidden="true" onClick={(e) => e.stopPropagation()} />
                  {/* Always mounted so YouTube's end screen never flashes through. */}
                  <div
                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 text-white transition-opacity ${
                      paused ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                  >
                    <h2 className="text-2xl font-display font-bold [text-shadow:0_2px_8px_rgba(0,0,0,0.85)]">
                      {t("player.paused")}
                    </h2>
                    <PlayerControls
                      variant="overlay"
                      paused={paused}
                      isFullscreen={isFullscreen}
                      onSeek={seekBy}
                      onTogglePlay={togglePlay}
                      onToggleFullscreen={toggleFullscreen}
                    />
                    <Button size="lg" className="rounded-full shadow-lg" onClick={play}>
                      <Play className="w-5 h-5 mr-2" aria-hidden="true" /> {t("player.resume")}
                    </Button>
                    <Button variant="secondary" className="rounded-full shadow-lg" onClick={goHome}>
                      {t("common.back")}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-white p-8 text-center gradient-warm">
                  <Lock className="w-16 h-16 mb-4" aria-hidden="true" />
                  <h2 className="text-3xl font-display font-bold">{t("player.locked")}</h2>
                  <p className="mt-2 opacity-90">{t("player.lockedDesc")}</p>
                </div>
              )}
            </div>
            {!locked && (
              <PlayerControls
                variant="bar"
                paused={paused}
                isFullscreen={isFullscreen}
                onSeek={seekBy}
                onTogglePlay={togglePlay}
                onToggleFullscreen={toggleFullscreen}
              />
            )}
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-display font-bold">{video.title}</h1>
              <div className="mt-1 text-sm text-muted-foreground">{video.channel.channel_name}</div>
              {description && (
                <p className="mt-3 text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">{description}</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                variant={fav?.favorited ? "default" : "outline"}
                className="rounded-full"
                aria-pressed={!!fav?.favorited}
                onClick={async () => {
                  try {
                    const r = await favFn({ data: { childId, videoId } });
                    toast.success(r.favorited ? t("favorites.added") : t("favorites.removed"));
                    void refetchFav();
                  } catch {
                    toast.error(t("common.retry"));
                  }
                }}
              >
                <Heart className={`w-4 h-4 mr-1 ${fav?.favorited ? "fill-current" : ""}`} aria-hidden="true" />{" "}
                {t("player.favorite")}
              </Button>
              {screen && (
                <div className="text-xs text-muted-foreground">
                  {t("player.remaining", { min: Math.max(0, Math.round(remaining)) })}
                </div>
              )}
            </div>
          </div>
          {related.length > 1 && (
            <section className="mt-8">
              <h2 className="text-lg font-display font-bold mb-3">{t("player.upNext")}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {related
                  .filter((r) => r.youtube_video_id !== videoId)
                  .map((r) => (
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

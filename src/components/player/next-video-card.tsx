import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { AUTOPLAY_NEXT_SECONDS } from "@/lib/autoplay-next";

type Next = { youtube_video_id: string; title: string; thumbnail_url?: string | null };

/** End-of-video card: counts down and plays `next` unless cancelled. */
export function NextVideoCard({ next, onPlay, onCancel }: { next: Next; onPlay: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const [left, setLeft] = useState(AUTOPLAY_NEXT_SECONDS);
  const playRef = useRef<HTMLButtonElement>(null);
  const onPlayRef = useRef(onPlay);
  onPlayRef.current = onPlay;

  useEffect(() => {
    playRef.current?.focus({ preventScroll: true });
    const id = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  useEffect(() => { if (left <= 0) onPlayRef.current(); }, [left]);

  const thumb = next.thumbnail_url ?? `https://i.ytimg.com/vi/${next.youtube_video_id}/hqdefault.jpg`;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/85 backdrop-blur-sm p-4" data-focus-zone="next-video">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        <div className="relative aspect-video bg-muted">
          <img src={thumb} alt="" className="w-full h-full object-cover" />
          <div className="absolute bottom-0 inset-x-0 h-1 bg-muted">
            <div className="h-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${(1 - left / AUTOPLAY_NEXT_SECONDS) * 100}%` }} />
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("player.nextVideo")} · {t("player.inSeconds", { s: Math.max(0, left) })}
          </div>
          <div className="mt-1 font-display font-bold line-clamp-2">{next.title}</div>
          <div className="mt-4 flex gap-3">
            <Button ref={playRef} className="rounded-full flex-1" onClick={onPlay}>
              <Play className="w-4 h-4 mr-2" /> {t("player.watchNow")}
            </Button>
            <Button variant="secondary" className="rounded-full" onClick={onCancel}>{t("player.cancel")}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

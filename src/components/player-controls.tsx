import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { SEEK_SECONDS } from "@/hooks/use-youtube-player";

type Props = {
  variant: "bar" | "overlay";
  paused: boolean;
  isFullscreen: boolean;
  onSeek: (delta: number) => void;
  onTogglePlay: () => void;
  onToggleFullscreen: () => void;
};

export function PlayerControls({
  variant,
  paused,
  isFullscreen,
  onSeek,
  onTogglePlay,
  onToggleFullscreen,
}: Props) {
  const { t } = useI18n();
  const sideVariant = variant === "overlay" ? "secondary" : "outline";

  return (
    <div
      className={`flex items-center justify-center gap-3 ${variant === "bar" ? "mt-3" : ""}`}
      role="group"
      aria-label={t("player.playPause")}
    >
      <Button
        size="lg"
        variant={sideVariant}
        className="rounded-full h-14 px-6 text-base font-semibold shadow-lg"
        aria-label={t("player.rewind", { s: SEEK_SECONDS })}
        onClick={() => onSeek(-SEEK_SECONDS)}
      >
        <RotateCcw className="w-6 h-6 mr-2" aria-hidden="true" /> {SEEK_SECONDS}s
      </Button>
      <Button
        size="lg"
        className="rounded-full h-16 w-16 p-0 shadow-lg"
        aria-label={t("player.playPause")}
        onClick={onTogglePlay}
      >
        {paused ? <Play className="w-7 h-7" aria-hidden="true" /> : <Pause className="w-7 h-7" aria-hidden="true" />}
      </Button>
      <Button
        size="lg"
        variant={sideVariant}
        className="rounded-full h-14 px-6 text-base font-semibold shadow-lg"
        aria-label={t("player.forward", { s: SEEK_SECONDS })}
        onClick={() => onSeek(SEEK_SECONDS)}
      >
        {SEEK_SECONDS}s <RotateCw className="w-6 h-6 ml-2" aria-hidden="true" />
      </Button>
      <Button
        size="lg"
        variant={sideVariant}
        className="rounded-full h-14 w-14 p-0 shadow-lg"
        aria-label={isFullscreen ? t("player.exitFullscreen") : t("player.fullscreen")}
        onClick={onToggleFullscreen}
      >
        {isFullscreen ? (
          <Minimize className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Maximize className="w-6 h-6" aria-hidden="true" />
        )}
      </Button>
    </div>
  );
}

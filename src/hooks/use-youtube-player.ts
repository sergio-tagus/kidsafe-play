import { useCallback, useEffect, useRef, useState } from "react";

export const SEEK_SECONDS = 10;

type YTNamespace = any;

let ytPromise: Promise<YTNamespace> | null = null;

/** Loads the YouTube IFrame API exactly once per document. */
export function loadYT(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as any;
  if (w.YT?.Player) return Promise.resolve(w.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
    w.onYouTubeIframeAPIReady = () => resolve(w.YT);
  });
  return ytPromise;
}

/** Hardens the embedded iframe: no keyboard focus, no cast/AirPlay, no download. */
function hardenIframe(iframe: HTMLIFrameElement | undefined) {
  if (!iframe) return;
  iframe.setAttribute("tabindex", "-1");
  iframe.setAttribute("disableRemotePlayback", "true");
  iframe.setAttribute("x-webkit-airplay", "deny");
  iframe.setAttribute("controlsList", "nodownload noremoteplayback noplaybackrate");
  iframe.setAttribute("allow", "autoplay; encrypted-media; fullscreen");
}

type Options = {
  /** YouTube video id, or null while the video is still loading. */
  videoId: string | null;
  /** Skip mounting the player (screen-time lock, offline, …). */
  disabled?: boolean;
  /** Called every heartbeat while playing; return false to force a pause. */
  onHeartbeat?: (info: { currentSeconds: number; totalSeconds: number }) => Promise<boolean> | boolean;
  heartbeatMs?: number;
};

export function useYouTubePlayer({ videoId, disabled, onHeartbeat, heartbeatMs = 15000 }: Options) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const heartbeatRef = useRef<number | null>(null);
  const heartbeatCb = useRef(onHeartbeat);
  heartbeatCb.current = onHeartbeat;

  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);

  const stopHeartbeat = () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  };

  useEffect(() => {
    if (!videoId || disabled) return;
    let mounted = true;

    void loadYT().then((YT) => {
      if (!mounted || !containerRef.current) return;
      playerRef.current = new YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          controls: 1,
          disablekb: 1,
          // Custom fullscreen on the wrapper keeps our controls and overlays visible.
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          autoplay: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
        events: {
          onReady: () => {
            try {
              hardenIframe(playerRef.current?.getIframe?.() as HTMLIFrameElement | undefined);
            } catch {
              /* ignore */
            }
          },
          onStateChange: (e: any) => {
            const p = playerRef.current;
            if (e.data === YT.PlayerState.PLAYING) {
              setPaused(false);
              if (heartbeatRef.current) return;
              heartbeatRef.current = window.setInterval(async () => {
                try {
                  const currentSeconds = Math.floor(p?.getCurrentTime?.() ?? 0);
                  const totalSeconds = Math.floor(p?.getDuration?.() ?? 0);
                  const allowed = (await heartbeatCb.current?.({ currentSeconds, totalSeconds })) ?? true;
                  if (!allowed) {
                    p?.pauseVideo?.();
                    stopHeartbeat();
                    setBlocked(true);
                  }
                } catch {
                  /* transient network errors must not kill playback */
                }
              }, heartbeatMs);
            } else {
              // Any non-playing state shows our overlay before YouTube's end screen.
              setPaused(true);
              stopHeartbeat();
            }
          },
        },
      });
    });

    return () => {
      mounted = false;
      stopHeartbeat();
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [videoId, disabled, heartbeatMs]);

  const seekBy = useCallback((delta: number) => {
    try {
      const p = playerRef.current;
      if (!p?.seekTo) return;
      const current = p.getCurrentTime?.() ?? 0;
      const total = p.getDuration?.() ?? 0;
      const next = Math.min(total > 0 ? total : Infinity, Math.max(0, current + delta));
      p.seekTo(next, true);
    } catch {
      /* ignore */
    }
  }, []);

  const togglePlay = useCallback(() => {
    try {
      const p = playerRef.current;
      if (!p) return;
      if (p.getPlayerState?.() === 1) p.pauseVideo?.();
      else {
        p.playVideo?.();
        setPaused(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const play = useCallback(() => {
    try {
      playerRef.current?.playVideo?.();
      setPaused(false);
    } catch {
      /* ignore */
    }
  }, []);

  return { containerRef, paused, blocked, seekBy, togglePlay, play };
}

/**
 * Fullscreens an arbitrary wrapper element so React overlays stay on top.
 *
 * iOS Safari has no element Fullscreen API (only `<video>.webkitEnterFullscreen`,
 * which we cannot reach inside the YouTube iframe), so we fall back to a
 * CSS-based fullscreen that fixes the wrapper over the viewport.
 */
export function useElementFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [simulated, setSimulated] = useState(false);

  useEffect(() => {
    const onChange = () => {
      const d = document as any;
      setNativeFullscreen(!!(document.fullscreenElement || d.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange as EventListener);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange as EventListener);
    };
  }, []);

  // Lock body scroll and allow Escape to leave the simulated mode.
  useEffect(() => {
    if (!simulated) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSimulated(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [simulated]);

  const toggle = useCallback(async () => {
    const el = ref.current as any;
    if (!el) return;
    const d = document as any;

    if (simulated) {
      setSimulated(false);
      return;
    }

    if (document.fullscreenElement || d.webkitFullscreenElement) {
      try {
        await (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      } catch {
        /* ignore */
      }
      return;
    }

    const request = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
    if (typeof request === "function") {
      try {
        await request.call(el);
        return;
      } catch {
        /* fall through to simulated fullscreen */
      }
    }
    setSimulated(true);
  }, [simulated]);

  return { ref, isFullscreen: nativeFullscreen || simulated, isSimulatedFullscreen: simulated, toggle };
}


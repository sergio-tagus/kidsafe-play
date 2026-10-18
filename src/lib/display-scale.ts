export type ForcedResolution = "auto" | "720" | "1080" | "2160";
const KEY = "safetube.forcedResolution";
const WIDTHS: Record<Exclude<ForcedResolution, "auto">, number> = { "720": 1280, "1080": 1920, "2160": 3840 };

/** Zoom factor so the layout behaves like a screen `targetWidth` CSS px wide. */
export function zoomFor(viewportWidth: number, res: ForcedResolution): number {
  if (res === "auto" || viewportWidth <= 0) return 1;
  return viewportWidth / WIDTHS[res];
}

export function getForcedResolution(): ForcedResolution {
  if (typeof window === "undefined") return "auto";
  const v = localStorage.getItem(KEY) as ForcedResolution | null;
  return v && (v === "auto" || v in WIDTHS) ? v : "auto";
}

let baseWidth = 0;
export function applyDisplayScale(res: ForcedResolution = getForcedResolution()) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.style.removeProperty("zoom");
  html.style.removeProperty("--page-zoom");
  baseWidth = window.innerWidth;
  const z = zoomFor(baseWidth, res);
  if (z !== 1) {
    html.style.setProperty("zoom", String(z));
    // Fullscreen layers divide viewport units by this to fill the real screen.
    html.style.setProperty("--page-zoom", String(z));
  }
}

export function setForcedResolution(res: ForcedResolution) {
  localStorage.setItem(KEY, res);
  applyDisplayScale(res);
}

export function readDisplayInfo() {
  return {
    screenW: Math.round(window.screen.width * window.devicePixelRatio),
    screenH: Math.round(window.screen.height * window.devicePixelRatio),
    viewW: window.innerWidth,
    viewH: window.innerHeight,
    dpr: window.devicePixelRatio,
  };
}

let wired = false;
export function initDisplayScale() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  applyDisplayScale();
  window.addEventListener("resize", () => {
    if (getForcedResolution() !== "auto") applyDisplayScale();
  });
}

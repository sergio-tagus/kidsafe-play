/**
 * TV mode detection + D-pad spatial navigation + remote "Back" handling.
 * Pure helpers are exported for tests; `initTvMode()` wires them in the browser.
 */

export function detectTv(ua: string, opts: { width: number; coarse: boolean; touch: boolean; forced?: string | null }): boolean {
  if (opts.forced === "1") return true;
  if (opts.forced === "0") return false;
  if (/Android TV|GoogleTV|Google TV|AFT[A-Z]|BRAVIA|SMART-TV|SmartTV|Tizen|Web0S|CrKey|AndroidTV/i.test(ua)) return true;
  // Large screen without any touch input: most likely a TV with a remote.
  return opts.width >= 1280 && !opts.touch && !opts.coarse && /Android/i.test(ua);
}

export type Dir = "up" | "down" | "left" | "right";

export function keyToDir(key: string): Dir | null {
  switch (key) {
    case "ArrowUp": return "up";
    case "ArrowDown": return "down";
    case "ArrowLeft": return "left";
    case "ArrowRight": return "right";
    default: return null;
  }
}

/** Keys that mean "Back" on TV remotes / browsers. */
export function isBackKey(key: string, keyCode?: number): boolean {
  return key === "GoBack" || key === "BrowserBack" || key === "Backspace" || keyCode === 4 || keyCode === 10009 || keyCode === 461;
}

/** Physical media keys on remotes. */
export function mediaKeyAction(key: string): "toggle" | "forward" | "rewind" | null {
  switch (key) {
    case "MediaPlayPause": case "MediaPlay": case "MediaPause": return "toggle";
    case "MediaFastForward": case "MediaTrackNext": return "forward";
    case "MediaRewind": case "MediaTrackPrevious": return "rewind";
    default: return null;
  }
}

/** Event the player listens to so the native Back button can leave simulated fullscreen. */
export const TV_EXIT_FULLSCREEN = "safetube:exit-fullscreen";

type Rect = { left: number; top: number; right: number; bottom: number };

/** Score a candidate rect for movement in `dir` from `from`. Lower is better; null = not in that direction. */
export function scoreCandidate(from: Rect, to: Rect, dir: Dir, sameZone = false): number | null {
  const fcx = (from.left + from.right) / 2, fcy = (from.top + from.bottom) / 2;
  const tcx = (to.left + to.right) / 2, tcy = (to.top + to.bottom) / 2;
  let main: number, cross: number;
  switch (dir) {
    case "right": main = to.left - from.right; cross = Math.abs(tcy - fcy); if (tcx <= fcx) return null; break;
    case "left": main = from.left - to.right; cross = Math.abs(tcy - fcy); if (tcx >= fcx) return null; break;
    case "down": main = to.top - from.bottom; cross = Math.abs(tcx - fcx); if (tcy <= fcy) return null; break;
    case "up": main = from.top - to.bottom; cross = Math.abs(tcx - fcx); if (tcy >= fcy) return null; break;
  }
  // Horizontal moves stay inside the current row/zone (big penalty otherwise).
  const zonePenalty = !sameZone && (dir === "left" || dir === "right") ? 100000 : 0;
  return Math.max(main, 0) + cross * 2 + zonePenalty;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), [role="button"], [role="tab"], [role="option"], [role="menuitem"], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return false;
  const s = getComputedStyle(el);
  return s.visibility !== "hidden" && s.display !== "none" && s.pointerEvents !== "none";
}

/** A zone is an explicit `data-focus-zone`, else the nearest nav/header/row-like scroll container. */
function zoneOf(el: Element): Element | null {
  return el.closest("[data-focus-zone], nav, header, aside, [role='dialog'], [class*='overflow-x']");
}

const lastInZone = new WeakMap<Element, HTMLElement>();

export function moveFocus(dir: Dir): boolean {
  const active = document.activeElement as HTMLElement | null;
  const scope: ParentNode = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"], [data-pseudo-fullscreen]') ?? document;
  const all = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((e) => e !== active && visible(e));
  if (!active || active === document.body || !scope.contains(active)) {
    all[0]?.focus();
    return !!all[0];
  }
  const fromZone = zoneOf(active);
  const from = active.getBoundingClientRect();
  let best: HTMLElement | null = null, bestScore = Infinity;
  for (const el of all) {
    const s = scoreCandidate(from, el.getBoundingClientRect(), dir, zoneOf(el) === fromZone);
    if (s !== null && s < bestScore) { bestScore = s; best = el; }
  }
  if (!best) return false;
  // Entering another zone: restore the element last focused there.
  const toZone = zoneOf(best);
  if (toZone && toZone !== fromZone) {
    const remembered = lastInZone.get(toZone);
    if (remembered && remembered.isConnected && visible(remembered)) best = remembered;
  }
  best.focus({ preventScroll: true });
  best.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
  return true;
}

function isTextField(el: Element | null) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return !["button", "checkbox", "radio", "submit", "range"].includes(type);
  }
  return (el as HTMLElement).isContentEditable;
}

let exitArmedUntil = 0;

function goBack(): boolean | "exit" {
  if (document.querySelector('[role="dialog"][data-state="open"], [role="menu"], [role="listbox"]')) {
    document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    return true;
  }
  if (document.querySelector("[data-pseudo-fullscreen]")) {
    window.dispatchEvent(new Event(TV_EXIT_FULLSCREEN));
    return true;
  }
  if (document.fullscreenElement) { void document.exitFullscreen(); return true; }
  if (window.location.pathname !== "/" && window.history.length > 1) { window.history.back(); return true; }
  // At the root: require a second Back within 3 s to leave the app.
  if (Date.now() < exitArmedUntil) return "exit";
  exitArmedUntil = Date.now() + 3000;
  void import("sonner").then(({ toast }) => toast(document.documentElement.lang?.startsWith("en") ? "Press Back again to exit" : document.documentElement.lang?.startsWith("pt") ? "Prima Voltar novamente para sair" : "Pulsa Atrás otra vez para salir"));
  return true;
}

function focusFirstUseful() {
  const active = document.activeElement;
  if (active && active !== document.body) return;
  const main = document.querySelector("main") ?? document.body;
  const el = Array.from(main.querySelectorAll<HTMLElement>(FOCUSABLE)).find(visible)
    ?? Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE)).find(visible);
  el?.focus({ preventScroll: true });
}

/** Decide what a key does on a TV text field. Not editing: OK enters edit, arrows navigate. Editing: Back/Enter leave edit. */
export function textFieldKeyAction(editing: boolean, key: string, keyCode?: number): "enter-edit" | "exit-edit" | "navigate" | "pass" {
  const back = isBackKey(key, keyCode);
  if (!editing) {
    if (key === "Enter") return "enter-edit";
    if (back) return "pass";
    return keyToDir(key) ? "navigate" : "pass";
  }
  // Backspace deletes text while editing; only real Back/Escape leave.
  if (key === "Escape" || (back && key !== "Backspace") || key === "Enter") return "exit-edit";
  return "pass";
}

const editingFields = new WeakSet<Element>();
function lockField(el: HTMLInputElement | HTMLTextAreaElement) {
  editingFields.delete(el);
  if (!el.hasAttribute("data-tv-ro")) el.setAttribute("data-tv-ro", el.readOnly ? "1" : "0");
  el.readOnly = true;
  el.setAttribute("inputmode", "none");
}
function unlockField(el: HTMLInputElement | HTMLTextAreaElement) {
  editingFields.add(el);
  el.readOnly = el.getAttribute("data-tv-ro") === "1";
  el.removeAttribute("inputmode");
  el.blur();
  el.focus();
}

let started = false;

export function initTvMode() {
  if (started || typeof window === "undefined") return;
  started = true;
  const params = new URLSearchParams(window.location.search);
  const forcedParam = params.get("tv");
  // Simulator iframe: force TV per-frame (sessionStorage) without persisting it for the whole site.
  if (forcedParam === "sim") sessionStorage.setItem("safetube.tv.sim", "1");
  else if (forcedParam) localStorage.setItem("safetube.tv", forcedParam);
  const simulated = window !== window.top && sessionStorage.getItem("safetube.tv.sim") === "1";
  const tv = simulated || detectTv(navigator.userAgent, {
    width: window.screen.width,
    coarse: matchMedia("(pointer: coarse)").matches,
    touch: navigator.maxTouchPoints > 0,
    forced: localStorage.getItem("safetube.tv"),
  });
  if (!tv) return;
  document.documentElement.classList.add("tv");

  // Remember the last focused element of each zone.
  document.addEventListener("focusin", (e) => {
    const t = e.target as HTMLElement;
    const z = zoneOf(t);
    if (z) lastInZone.set(z, t);
    if (isTextField(t) && !editingFields.has(t)) lockField(t as HTMLInputElement);
  });
  document.addEventListener("focusout", (e) => {
    const t = e.target as HTMLElement;
    if (isTextField(t) && editingFields.has(t) && document.hasFocus()) {
      setTimeout(() => { if (document.activeElement !== t) lockField(t as HTMLInputElement); }, 0);
    }
  });

  // Autofocus the first useful element whenever the page changes.
  let lastPath = location.pathname;
  setTimeout(focusFirstUseful, 400);
  setInterval(() => {
    if (location.pathname !== lastPath) { lastPath = location.pathname; setTimeout(focusFirstUseful, 300); }
    else if (document.activeElement === document.body) focusFirstUseful();
  }, 500);

  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented) return;
    const act = document.activeElement;
    if (isTextField(act)) {
      const field = act as HTMLInputElement;
      const a = textFieldKeyAction(editingFields.has(field), e.key, e.keyCode);
      if (a === "enter-edit") { e.preventDefault(); unlockField(field); return; }
      if (a === "exit-edit") {
        // Let Enter submit forms; Back only leaves edit mode.
        if (e.key !== "Enter") e.preventDefault();
        lockField(field);
        return;
      }
      if (a === "navigate") { const d = keyToDir(e.key)!; if (moveFocus(d)) e.preventDefault(); return; }
      if (!editingFields.has(field) && isBackKey(e.key, e.keyCode)) { if (goBack()) e.preventDefault(); return; }
      return;
    }
    if (isBackKey(e.key, e.keyCode) && !isTextField(document.activeElement)) {
      if (goBack()) e.preventDefault();
      return;
    }
    const dir = keyToDir(e.key);
    if (!dir) return;
    const active = document.activeElement;
    if (isTextField(active) && (dir === "left" || dir === "right")) return;
    if (moveFocus(dir)) e.preventDefault();
  });

  void (async () => {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { App } = await import("@capacitor/app");
    App.addListener("backButton", () => {
      if (goBack() === "exit") void App.exitApp();
    });
  })();
}

export function isTvMode() {
  return typeof document !== "undefined" && document.documentElement.classList.contains("tv");
}

/** onKeyDownCapture for menu/select triggers: on TV, arrows move focus instead of opening; OK opens. */
export function tvTriggerKeyCapture(e: { key: string; stopPropagation(): void; preventDefault(): void }) {
  if (!isTvMode()) return;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.stopPropagation();
    e.preventDefault();
    moveFocus(e.key === "ArrowDown" ? "down" : "up");
  }
}

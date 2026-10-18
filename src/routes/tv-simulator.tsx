import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Home, Undo2, Play, Rewind, FastForward, RotateCw } from "lucide-react";

export const Route = createFileRoute("/tv-simulator")({
  head: () => ({
    meta: [
      { title: "Simulador Google TV — SafeTube Kids" },
      { name: "description", content: "Prueba la navegación con mando de SafeTube Kids en un televisor simulado 16:9." },
      { property: "og:title", content: "Simulador Google TV — SafeTube Kids" },
      { property: "og:description", content: "Mando virtual, guías de zona segura e inspector de foco para la app de TV." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TvSimulator,
});

const RES = { "720p": [1280, 720], "1080p": [1920, 1080] } as const;
type Res = keyof typeof RES;

function describe(el: Element | null | undefined) {
  if (!el) return null;
  const h = el as HTMLElement;
  const label = h.getAttribute("aria-label") || h.innerText?.trim().split("\n")[0] || h.getAttribute("title") || "";
  const role = h.getAttribute("role");
  return `<${el.tagName.toLowerCase()}${role ? ` role="${role}"` : ""}> ${label.slice(0, 60)}`;
}

function TvSimulator() {
  const frame = useRef<HTMLIFrameElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [res, setRes] = useState<Res>("1080p");
  const [scale, setScale] = useState(0.5);
  const [safe, setSafe] = useState(true);
  const [hideCursor, setHideCursor] = useState(true);
  const [focus, setFocus] = useState<{ text: string | null; lost: boolean }>({ text: null, lost: false });
  const [w, h] = RES[res];

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const fit = () => setScale(Math.min((el.clientWidth - 32) / w, (el.clientHeight - 32) / h));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [w, h]);

  const win = () => frame.current?.contentWindow ?? null;

  const press = useCallback((key: string, keyCode = 0) => {
    const w = win();
    if (!w) return;
    w.focus();
    const doc = w.document;
    const target = (doc.activeElement as HTMLElement | null) ?? doc.body;
    const KE = (w as unknown as { KeyboardEvent: typeof KeyboardEvent }).KeyboardEvent;
    const ev = new KE("keydown", { key, keyCode, bubbles: true, cancelable: true });
    target.dispatchEvent(ev);
    target.dispatchEvent(new KE("keyup", { key, keyCode, bubbles: true }));
    // Synthetic Enter doesn't activate buttons natively; emulate the OK click.
    if (key === "Enter" && !ev.defaultPrevented && target !== doc.body) target.click();
  }, []);

  const home = () => { const w = win(); if (w) w.location.href = "/?tv=sim"; };
  const recover = () => {
    const w = win();
    const el = w?.document.querySelector<HTMLElement>("main a[href], main button, a[href], button");
    el?.focus();
  };

  // Physical keyboard → remote (when the simulator page itself has focus).
  useEffect(() => {
    const map: Record<string, [string, number?]> = {
      ArrowUp: ["ArrowUp"], ArrowDown: ["ArrowDown"], ArrowLeft: ["ArrowLeft"], ArrowRight: ["ArrowRight"],
      Enter: ["Enter"], " ": ["MediaPlayPause"], Escape: ["GoBack", 4], Backspace: ["GoBack", 4],
    };
    const onKey = (e: KeyboardEvent) => {
      const m = map[e.key];
      if (!m) return;
      e.preventDefault();
      press(m[0], m[1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  // Focus HUD.
  useEffect(() => {
    const id = setInterval(() => {
      const d = frame.current?.contentDocument;
      if (!d) return;
      const a = d.activeElement;
      const lost = !a || a === d.body;
      setFocus({ text: lost ? null : describe(a), lost });
    }, 300);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground lg:flex-row">
      <div ref={stage} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <div style={{ width: w * scale, height: h * scale }} className="relative">
          <div
            className="absolute left-0 top-0 origin-top-left overflow-hidden rounded-[12px] border-[14px] border-foreground/90 bg-foreground shadow-2xl"
            style={{ width: w + 28, height: h + 28, transform: `scale(${scale})`, margin: -14 * scale }}
          >
            <iframe ref={frame} title="TV" src="/?tv=sim" width={w} height={h} className="block border-0 bg-background" />
            {safe && (
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute border-2 border-dashed border-primary/70" style={{ inset: "5%" }} />
                <div className="absolute border-2 border-dashed border-destructive/70" style={{ inset: "2.5%" }} />
              </div>
            )}
            {hideCursor && <div className="absolute inset-0 cursor-none" onClick={() => win()?.focus()} />}
          </div>
        </div>
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border bg-card p-4 lg:w-72 lg:border-l lg:border-t-0">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">Simulador TV</h1>
          <Link to="/" className="text-sm text-muted-foreground underline">Salir</Link>
        </div>

        <div className={`rounded-lg border p-2 text-xs ${focus.lost ? "border-destructive bg-destructive/10 text-destructive" : "border-border"}`}>
          <div className="font-semibold">{focus.lost ? "⚠ Foco perdido" : "Foco actual"}</div>
          <div className="mt-1 break-all font-mono">{focus.text ?? "<body>"}</div>
          {focus.lost && <button onClick={recover} className="mt-2 rounded bg-destructive px-2 py-1 text-destructive-foreground">Recuperar foco</button>}
        </div>

        <div className="mx-auto flex w-48 flex-col items-center gap-3 rounded-[40px] bg-muted p-5">
          <div className="relative h-36 w-36 rounded-full bg-secondary">
            <RB className="absolute left-1/2 top-1 -translate-x-1/2" label="Arriba" onClick={() => press("ArrowUp")}><ArrowUp /></RB>
            <RB className="absolute bottom-1 left-1/2 -translate-x-1/2" label="Abajo" onClick={() => press("ArrowDown")}><ArrowDown /></RB>
            <RB className="absolute left-1 top-1/2 -translate-y-1/2" label="Izquierda" onClick={() => press("ArrowLeft")}><ArrowLeft /></RB>
            <RB className="absolute right-1 top-1/2 -translate-y-1/2" label="Derecha" onClick={() => press("ArrowRight")}><ArrowRight /></RB>
            <button aria-label="OK" onClick={() => press("Enter")} className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary font-bold text-primary-foreground active:scale-95">OK</button>
          </div>
          <div className="flex gap-3">
            <RB label="Atrás" onClick={() => press("GoBack", 4)}><Undo2 /></RB>
            <RB label="Inicio" onClick={home}><Home /></RB>
          </div>
          <div className="flex gap-3">
            <RB label="Rebobinar" onClick={() => press("MediaRewind")}><Rewind /></RB>
            <RB label="Play/Pausa" onClick={() => press("MediaPlayPause")}><Play /></RB>
            <RB label="Avanzar" onClick={() => press("MediaFastForward")}><FastForward /></RB>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground">Teclado: flechas, Enter = OK, Esc/Retroceso = Atrás, Espacio = Play</p>

        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            {(Object.keys(RES) as Res[]).map((r) => (
              <button key={r} onClick={() => setRes(r)} className={`flex-1 rounded-md border px-2 py-1 ${res === r ? "border-primary bg-primary/15" : "border-border"}`}>{r}</button>
            ))}
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> Guías de zona segura (90% / 95%)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={hideCursor} onChange={(e) => setHideCursor(e.target.checked)} /> Bloquear ratón (solo mando)</label>
          <button onClick={() => frame.current?.contentWindow?.location.reload()} className="flex w-full items-center justify-center gap-2 rounded-md border border-border py-1"><RotateCw className="h-4 w-4" /> Recargar TV</button>
        </div>
      </aside>
    </div>
  );
}

function RB({ children, label, onClick, className = "" }: { children: React.ReactNode; label: string; onClick: () => void; className?: string }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className={`flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground shadow active:scale-90 [&_svg]:h-5 [&_svg]:w-5 ${className}`}>
      {children}
    </button>
  );
}

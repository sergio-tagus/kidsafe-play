import { useCallback, useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { TOUR_STEPS, TOUR_COUNT } from "@/lib/onboarding-steps";
import {
  getOnboardingState,
  setOnboardingStep,
  skipOnboarding,
  dismissOnboarding,
  type OnboardingState,
} from "@/lib/onboarding.functions";

type Rect = { top: number; left: number; width: number; height: number };

const OPEN_EVENT = "safetube:tour-open";

/**
 * The tour is rendered from ParentShell, which remounts on every parent-panel
 * navigation. Keeping open/index in a module store lets the tour survive the
 * screen changes it performs itself (step 3 onwards).
 */
type TourRun = { open: boolean; index: number };
let runState: TourRun = { open: false, index: 0 };
const runListeners = new Set<() => void>();
function setRun(next: TourRun) {
  runState = next;
  runListeners.forEach((l) => l());
}
function subscribeRun(l: () => void) {
  runListeners.add(l);
  return () => runListeners.delete(l);
}
function useTourRun() {
  return useSyncExternalStore(
    subscribeRun,
    () => runState,
    () => runState,
  );
}

export function openOnboardingTour(opts?: { restart?: boolean }) {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { restart: !!opts?.restart } }));
}

export function useOnboardingState() {
  const fn = useServerFn(getOnboardingState);
  return useQuery<OnboardingState>({ queryKey: ["onboarding"], queryFn: () => fn() as any });
}

export function OnboardingTour({ suspended = false }: { suspended?: boolean }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const { data: state } = useOnboardingState();
  const saveFn = useServerFn(setOnboardingStep);
  const skipFn = useServerFn(skipOnboarding);
  const save = useMutation({
    mutationFn: (v: { step: number; status?: OnboardingState["status"] }) => saveFn({ data: v }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding"] }),
  });
  const skip = useMutation({
    mutationFn: (v: { step: number }) => skipFn({ data: v }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding"] }),
  });
  const dismissFn = useServerFn(dismissOnboarding);
  const dismiss = useMutation({
    mutationFn: (v: { step: number }) => dismissFn({ data: v }) as any,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["onboarding"] }),
  });

  const { open, index } = useTourRun();
  const setOpen = (v: boolean) => setRun({ open: v, index: runState.index });
  const setIndex = (i: number) => setRun({ open: runState.open, index: i });
  const [rect, setRect] = useState<Rect | null>(null);

  // Auto-open on first visit; resume where the parent left off.
  useEffect(() => {
    if (suspended || !state) return;
    if (state.status === "pending" && !runState.open) setRun({ open: true, index: 0 });
  }, [state, suspended]);

  useEffect(() => {
    const handler = (e: Event) => {
      const restart = (e as CustomEvent).detail?.restart;
      setRun({ open: true, index: restart ? 0 : Math.min(state?.step ?? 0, TOUR_COUNT - 1) });
    };
    window.addEventListener(OPEN_EVENT, handler as EventListener);
    return () => window.removeEventListener(OPEN_EVENT, handler as EventListener);
  }, [state?.step]);

  const step = TOUR_STEPS[index];

  // Navigate to the step's screen.
  useEffect(() => {
    if (!open || !step) return;
    if (path !== step.to) navigate({ to: step.to as any }).catch(() => {});
  }, [open, index, step, path, navigate]);

  // Track the spotlighted element.
  const measure = useCallback(() => {
    if (!open || !step) return;
    if (!step.anchor) { setRect(null); return; }
    const el = document.querySelector(`[data-tour="${step.anchor}"]`) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open) return;
    measure();
    // Re-measure often so the spotlight appears as soon as the target screen
    // finishes rendering after the step's own navigation.
    const id = window.setInterval(measure, 200);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure, path, index]);

  const close = () => { setOpen(false); setRect(null); };

  const goto = (next: number) => {
    setIndex(next);
    save.mutate({ step: next, status: "in_progress" });
  };

  const onSkip = () => { skip.mutate({ step: index }); close(); };
  const onNever = () => { dismiss.mutate({ step: index }); close(); };
  const onFinish = () => { save.mutate({ step: TOUR_COUNT - 1, status: "done" }); close(); };

  const next = () => (index >= TOUR_COUNT - 1 ? onFinish() : goto(index + 1));
  const prev = () => index > 0 && goto(index - 1);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onSkip(); }
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (suspended || !open || !step) return null;

  const pad = 8;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  const checklist = state?.checklist;

  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={t("tour.aria")}>
      {/* Dim layer with a cut-out around the highlighted element */}
      {spot ? (
        <div
          className="absolute inset-0 pointer-events-auto transition-all"
          style={{
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.6)`,
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            borderRadius: 16,
            outline: "3px solid hsl(var(--primary, 265 85% 60%))",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Card */}
      <div
        className="absolute left-1/2 -translate-x-1/2 bottom-4 w-[calc(100%-2rem)] max-w-md md:max-w-lg md:bottom-8 rounded-2xl bg-background border border-border shadow-2xl p-5"
        style={
          spot && spot.top > 260
            ? { top: Math.max(16, spot.top - 16), bottom: "auto", transform: "translate(-50%, -100%)" }
            : spot
              ? { top: Math.min(window.innerHeight - 240, spot.top + spot.height + 16), bottom: "auto" }
              : { top: "50%", bottom: "auto", transform: "translate(-50%, -50%)" }
        }
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">🦄</span>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-muted-foreground mb-1">
              {t("tour.stepOf").replace("{i}", String(index + 1)).replace("{n}", String(TOUR_COUNT))}
            </div>
            <h2 className="font-display font-bold text-lg">{t(step.titleKey)}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t(step.bodyKey)}</p>

            {step.id === "done" && checklist && (
              <ul className="mt-3 space-y-1 text-sm">
                <ChecklistRow ok={checklist.children} label={t("tour.check.children")} />
                <ChecklistRow ok={checklist.channels} label={t("tour.check.channels")} />
                <ChecklistRow ok={checklist.categories} label={t("tour.check.categories")} />
                <ChecklistRow ok={checklist.pin} label={t("tour.check.pin")} />
              </ul>
            )}
          </div>
          <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={onSkip} aria-label={t("tour.skip")}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 mt-4">
          <Button variant="ghost" className="rounded-xl" onClick={onSkip}>{t("tour.skip")}</Button>
          <div className="flex-1" />
          {index > 0 && (
            <Button variant="outline" className="rounded-xl" onClick={prev}>
              <ChevronLeft className="w-4 h-4 mr-1" /> {t("tour.back")}
            </Button>
          )}
          <Button className="rounded-xl" onClick={next}>
            {index >= TOUR_COUNT - 1 ? t("tour.finish") : t("tour.next")}
            {index < TOUR_COUNT - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-flex w-5 h-5 items-center justify-center rounded-full ${ok ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </span>
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

/** Discreet "resume setup" banner shown when the tour was left unfinished. */
export function OnboardingResumeBanner() {
  const { t } = useI18n();
  const { data: state } = useOnboardingState();
  if (!state) return null;
  if (state.status !== "in_progress" && state.status !== "skipped") return null;
  const step = Math.min((state.step ?? 0) + 1, TOUR_COUNT);
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/50 px-4 py-3">
      <span className="text-xl">🦄</span>
      <span className="text-sm font-medium flex-1 min-w-[12rem]">
        {t("tour.resume").replace("{i}", String(step)).replace("{n}", String(TOUR_COUNT))}
      </span>
      <Button size="sm" className="rounded-xl" onClick={() => openOnboardingTour()}>{t("tour.resumeCta")}</Button>
    </div>
  );
}

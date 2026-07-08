import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { getParentUnlockStatus, verifyPin, lockParent } from "@/lib/pin.functions";
import { clearParentUnlock, markParentUnlocked } from "@/routes/_authenticated/parent/route";
import { useI18n } from "@/lib/i18n";

export function ParentUnlockGuard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const statusFn = useServerFn(getParentUnlockStatus);
  const verifyFn = useServerFn(verifyPin);
  const lockFn = useServerFn(lockParent);

  const { data: status, refetch } = useQuery({
    queryKey: ["parent-unlock-status"],
    queryFn: () => statusFn(),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Schedule an exact refetch right when the unlock expires.
  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!status?.expiresAt) return;
    const ms = new Date(status.expiresAt).getTime() - Date.now();
    if (ms <= 0) return;
    timerRef.current = window.setTimeout(() => { refetch(); }, ms + 500);
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
  }, [status?.expiresAt, refetch]);

  const locked = status?.hasPin && !status.unlocked;

  const submit = async (next: string) => {
    setBusy(true);
    try {
      const res = await verifyFn({ data: { pin: next } });
      if (!res.ok) {
        toast.error(t("pin.wrong"));
        setPin("");
        setBusy(false);
        return;
      }
      markParentUnlocked();
      setPin("");
      await refetch();
      qc.invalidateQueries();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally {
      setBusy(false);
    }
  };

  const onDigit = (d: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) submit(next);
  };
  const onBack = () => !busy && setPin((p) => p.slice(0, -1));

  useEffect(() => {
    if (!locked) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") onDigit(e.key);
      else if (e.key === "Backspace") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, pin, busy]);

  const exit = async () => {
    try { await lockFn(); } catch { /* ignore */ }
    clearParentUnlock();
    navigate({ to: "/" });
  };

  return (
    <Dialog open={!!locked}>
      <DialogContent
        className="max-w-sm"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-center">{t("pin.expired")}</DialogTitle>
            <p className="text-sm text-muted-foreground text-center">{t("pin.expiredDesc")}</p>
          </div>
        </DialogHeader>
        <div className="flex justify-center gap-3 my-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < pin.length ? "bg-primary border-primary" : "border-muted-foreground/40"}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {["1","2","3","4","5","6","7","8","9"].map((d) => (
            <Button key={d} variant="outline" className="h-14 text-xl font-display" onClick={() => onDigit(d)} disabled={busy}>{d}</Button>
          ))}
          <div />
          <Button variant="outline" className="h-14 text-xl font-display" onClick={() => onDigit("0")} disabled={busy}>0</Button>
          <Button variant="ghost" className="h-14" onClick={onBack} disabled={busy}>⌫</Button>
        </div>
        <Button variant="ghost" className="mt-2" onClick={exit}>{t("nav.exit")}</Button>
      </DialogContent>
    </Dialog>
  );
}

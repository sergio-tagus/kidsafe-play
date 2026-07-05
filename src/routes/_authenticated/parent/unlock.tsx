import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { hasPin, setPin, verifyPin, requestPinReset } from "@/lib/pin.functions";
import { markParentUnlocked } from "./route";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock, ArrowLeft } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/parent/unlock")({
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" ? s.next : "/parent" }),
  component: UnlockPage,
});

function UnlockPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/parent/unlock" });
  const hasFn = useServerFn(hasPin);
  const setFn = useServerFn(setPin);
  const verifyFn = useServerFn(verifyPin);
  const resetFn = useServerFn(requestPinReset);

  const { data, isLoading } = useQuery({ queryKey: ["parent-pin-has"], queryFn: () => hasFn() });

  const [mode, setMode] = useState<"enter" | "setup" | "confirm">("enter");
  const [pin, setPinValue] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !data.hasPin) setMode("setup");
  }, [data]);

  const done = async (nextPin: string) => {
    setBusy(true);
    try {
      if (mode === "setup") {
        setFirstPin(nextPin);
        setPinValue("");
        setMode("confirm");
        setBusy(false);
        return;
      }
      if (mode === "confirm") {
        if (nextPin !== firstPin) {
          toast.error(t("pin.mismatch"));
          setPinValue("");
          setMode("setup");
          setFirstPin("");
          setBusy(false);
          return;
        }
        await setFn({ data: { pin: nextPin } });
        markParentUnlocked();
        toast.success(t("pin.setSuccess"));
        navigate({ to: search.next as any });
        return;
      }
      // enter
      const res = await verifyFn({ data: { pin: nextPin } });
      if (!res.ok) {
        toast.error(t("pin.wrong"));
        setPinValue("");
        setBusy(false);
        return;
      }
      markParentUnlocked();
      navigate({ to: search.next as any });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
      setBusy(false);
    }
  };

  const onDigit = (d: string) => {
    if (busy) return;
    if (pin.length >= 4) return;
    const next = pin + d;
    setPinValue(next);
    if (next.length === 4) done(next);
  };
  const onBack = () => !busy && setPinValue((p) => p.slice(0, -1));

  // Keyboard support
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") onDigit(e.key);
      else if (e.key === "Backspace") onBack();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const forgot = async () => {
    try {
      const { email } = await resetFn();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/parent/reset-pin` },
      });
      if (error) throw error;
      toast.success(t("pin.emailSent"));
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  const title =
    mode === "setup" ? t("pin.setup")
    : mode === "confirm" ? t("pin.confirm")
    : t("pin.enter");

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="absolute top-4 left-4">
        <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}</Button>
      </Link>
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-center">{title}</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {mode === "setup" ? t("pin.setupDesc") : mode === "confirm" ? t("pin.confirmDesc") : t("pin.enterDesc")}
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : (
            <>
              <div className="flex justify-center gap-3 my-6">
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

              {mode === "enter" && (
                <div className="mt-6 text-center">
                  <button className="text-sm text-primary underline" onClick={forgot}>
                    {t("pin.forgot")}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { setPin } from "@/lib/pin.functions";
import { markParentUnlocked } from "./route";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/reset-pin")({
  component: ResetPinPage,
});

function ResetPinPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setFn = useServerFn(setPin);
  const [pin, setPinValue] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [mode, setMode] = useState<"setup" | "confirm">("setup");
  const [busy, setBusy] = useState(false);

  const done = async (nextPin: string) => {
    if (mode === "setup") {
      setFirstPin(nextPin);
      setPinValue("");
      setMode("confirm");
      return;
    }
    if (nextPin !== firstPin) {
      toast.error(t("pin.mismatch"));
      setMode("setup");
      setFirstPin("");
      setPinValue("");
      return;
    }
    setBusy(true);
    try {
      await setFn({ data: { pin: nextPin } });
      markParentUnlocked();
      toast.success(t("pin.setSuccess"));
      navigate({ to: "/parent" });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
      setBusy(false);
    }
  };

  const onDigit = (d: string) => {
    if (busy || pin.length >= 4) return;
    const next = pin + d;
    setPinValue(next);
    if (next.length === 4) done(next);
  };
  const onBack = () => !busy && setPinValue((p) => p.slice(0, -1));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") onDigit(e.key);
      else if (e.key === "Backspace") onBack();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-display font-bold text-center">{t("pin.reset.title")}</h1>
            <p className="text-sm text-muted-foreground text-center mt-1">
              {mode === "setup" ? t("pin.setupDesc") : t("pin.confirmDesc")}
            </p>
          </div>
          <div className="flex justify-center gap-3 my-6">
            {[0,1,2,3].map((i) => (
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
        </CardContent>
      </Card>
    </div>
  );
}

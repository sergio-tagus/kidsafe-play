import { QRCodeSVG } from "qrcode.react";
import { Check, KeyRound, Monitor } from "lucide-react";
import { useEffect, useRef } from "react";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const PUBLIC_ORIGIN = "https://kidsafe-play.mediaatlastv.com";

export function TvWelcome({
  hasPin,
  hasChannels,
  onRecheck,
  onSkip,
}: {
  hasPin: boolean;
  hasChannels: boolean;
  onRecheck: () => void;
  onSkip: () => void;
}) {
  const { t } = useI18n();
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), []);
  const url = `${PUBLIC_ORIGIN}/parent`;
  const steps = [
    { done: hasPin, icon: KeyRound, label: t("tvWelcome.step1") },
    { done: hasChannels, icon: Monitor, label: t("tvWelcome.step2") },
  ];
  return (
    <div className="min-h-screen gradient-cool flex items-center justify-center p-8">
      <div className="w-full max-w-6xl rounded-3xl bg-card text-card-foreground shadow-2xl p-12 grid grid-cols-[1fr_auto] gap-12 items-center">
        <div>
          <div className="text-6xl mb-4">🦄</div>
          <h1 className="text-4xl font-display font-bold">{t("tvWelcome.title")}</h1>
          <p className="mt-4 text-xl text-muted-foreground">{t("tvWelcome.body")}</p>
          <ol className="mt-8 space-y-4">
            {steps.map((s, i) => (
              <li key={i} className="flex items-center gap-4 text-2xl">
                <span className={`flex h-12 w-12 items-center justify-center rounded-full ${s.done ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  {s.done ? <Check className="h-6 w-6" /> : <s.icon className="h-6 w-6" />}
                </span>
                {i + 1}. {s.label}
              </li>
            ))}
          </ol>
          <p className="mt-8 text-lg text-muted-foreground">{t("tvWelcome.openOn")}</p>
          <p className="font-mono text-3xl font-bold text-primary">{url.replace("https://", "")}</p>
          <div className="mt-10 flex gap-4">
            <Button ref={first} size="lg" className="rounded-full text-xl h-auto py-4 px-8" onClick={onRecheck}>
              {t("tvWelcome.done")}
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full text-xl h-auto py-4 px-8" onClick={onSkip}>
              {t("tvWelcome.skip")}
            </Button>
          </div>
        </div>
        <div className="text-center">
          <div className="rounded-2xl bg-background p-4 inline-block">
            <QRCodeSVG value={url} size={1024} style={{ width: "12rem", height: "12rem" }} />
          </div>
          <p className="mt-3 text-lg text-muted-foreground">{t("tvWelcome.orPhone")}</p>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { approveTvCode } from "@/lib/tv-login.functions";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/tv-link")({
  validateSearch: (s) => z.object({ code: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Conectar TV — SafeTube Kids" },
      { name: "description", content: "Connect your Google TV to your SafeTube Kids account with a code." },
      { property: "og:title", content: "Conectar TV — SafeTube Kids" },
      { property: "og:description", content: "Connect your Google TV to your SafeTube Kids account with a code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TvLinkPage,
});

function TvLinkPage() {
  const { t } = useI18n();
  const search = Route.useSearch();
  const [code, setCode] = useState((search.code ?? "").toUpperCase());
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const approve = useServerFn(approveTvCode);

  const submit = async () => {
    setBusy(true);
    try {
      await approve({ data: { code } });
      setDone(true);
      toast.success(t("tv.linkOk"));
    } catch {
      toast.error(t("tv.linkError"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 gradient-fun">
      <div className="w-full max-w-sm rounded-3xl bg-card p-8 shadow-2xl text-center">
        <div className="text-5xl mb-3">📺</div>
        <h1 className="text-2xl font-display font-bold text-foreground">{t("tv.linkTitle")}</h1>
        {done ? (
          <>
            <p className="mt-4 text-foreground">{t("tv.linkOk")}</p>
            <Button asChild className="mt-6 rounded-full"><Link to="/">OK</Link></Button>
          </>
        ) : (
          <>
            <p className="mt-2 text-muted-foreground">{t("tv.linkHelp")}</p>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              className="mt-6 text-center text-2xl tracking-[0.4em] font-mono h-14"
              placeholder="ABC123"
              autoFocus
            />
            <Button className="mt-4 w-full rounded-full" disabled={code.length !== 6 || busy} onClick={submit}>
              {t("tv.linkButton")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

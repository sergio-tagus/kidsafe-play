import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useServerFn } from "@tanstack/react-start";
import { createTvCode, pollTvCode } from "@/lib/tv-login.functions";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

/** Public site address used in the QR (the TV app itself runs from a local origin). */
const PUBLIC_ORIGIN = "https://kidsafe-play.mediaatlastv.com";

export function TvPhoneLogin() {
  const { t } = useI18n();
  const create = useServerFn(createTvCode);
  const poll = useServerFn(pollTvCode);
  const [pair, setPair] = useState<{ code: string; secret: string } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (pair) return;
    create().then((p) => { setPair(p); setExpired(false); }).catch(() => {});
  }, [pair, create]);

  useEffect(() => {
    if (!pair) return;
    const id = setInterval(async () => {
      try {
        const r = await poll({ data: pair });
        if (r.status === "approved" && "tokenHash" in r) {
          clearInterval(id);
          await supabase.auth.verifyOtp({ token_hash: r.tokenHash, type: "magiclink" });
        } else if (r.status === "expired" || r.status === "invalid" || r.status === "used") {
          clearInterval(id);
          setExpired(true);
          setPair(null);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(id);
  }, [pair, poll]);

  const url = pair ? `${PUBLIC_ORIGIN}/tv-link?code=${pair.code}` : "";
  return (
    <div className="mt-6 rounded-2xl border border-border p-5 text-center">
      <h2 className="text-lg font-display font-semibold text-foreground">{t("tv.phoneLogin")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("tv.scan")}</p>
      {pair ? (
        <>
          <div className="mt-4 inline-block rounded-xl bg-card p-3">
            <QRCodeSVG value={url} size={512} style={{ width: "9rem", height: "9rem" }} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{PUBLIC_ORIGIN.replace("https://", "")}/tv-link</p>
          <p className="mt-2 font-mono text-4xl tracking-[0.3em] text-foreground">{pair.code}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("tv.waiting")}</p>
        </>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">{expired ? t("tv.expired") : "…"}</p>
      )}
    </div>
  );
}

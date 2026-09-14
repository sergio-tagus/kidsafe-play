import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { lovable } from "@/integrations/lovable";
import { useSession } from "@/lib/session";
import { useI18n, LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ next: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — SafeTube Kids" },
      { name: "description", content: "Sign in to SafeTube Kids to manage safe videos for your children." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const search = useSearch({ from: "/auth" });

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: search.next ?? "/", replace: true });
    }
  }, [session, loading, navigate, search.next]);

  const handleGoogle = async () => {
    const redirectUri = Capacitor.isNativePlatform()
      ? "com.safetube.kids://auth/callback"
      : `${window.location.origin}/auth`;
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
    if (result.error) {
      toast.error(result.error.message || "Sign-in failed");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gradient-fun">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">🦄</div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t("auth.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("auth.subtitle")}</p>
        </div>
        <Button size="lg" className="w-full rounded-full text-base py-6" onClick={handleGoogle}>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.2 5.2c-.4.4 6.5-4.7 6.5-14.7 0-1.3-.1-2.4-.4-3.5z"/></svg>
          {t("auth.continueGoogle")}
        </Button>
        <div className="mt-6 flex items-center justify-center gap-2">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`text-xs rounded-full px-3 py-1 border ${lang === l.code ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-border text-muted-foreground"}`}
            >
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("auth.privacy")}{" "}
          <Link to="/privacy" className="underline hover:text-foreground">
            {t("privacy.title")}
          </Link>
        </p>
      </div>
      <p className="mt-6 text-white/90 text-sm">SafeTube Kids · {new Date().getFullYear()}</p>
    </div>
  );
}

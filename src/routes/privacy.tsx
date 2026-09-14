import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — SafeTube Kids" },
      { name: "description", content: "Privacy policy for SafeTube Kids, a whitelisted video app for children." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <Link to="/">
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("common.back")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <span className="font-display font-bold text-lg">{t("privacy.title")}</span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-4xl">🦄</span>
          <Shield className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">{t("privacy.title")}</h1>
        <p className="text-muted-foreground mb-8">{t("privacy.lastUpdated")}</p>

        <section className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-lg leading-relaxed">{t("privacy.intro")}</p>

          <h2 className="text-xl font-bold mt-8 mb-3">{t("privacy.data.title")}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("privacy.data.children")}</li>
            <li>{t("privacy.data.history")}</li>
            <li>{t("privacy.data.channels")}</li>
            <li>{t("privacy.data.youtube")}</li>
            <li>{t("privacy.data.local")}</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">{t("privacy.rights.title")}</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>{t("privacy.rights.access")}</li>
            <li>{t("privacy.rights.delete")}</li>
          </ul>

          <h2 className="text-xl font-bold mt-8 mb-3">{t("privacy.contact.title")}</h2>
          <p>{t("privacy.contact.email")}</p>

          <div className="mt-10 p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground m-0">{t("privacy.legalNotice")}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

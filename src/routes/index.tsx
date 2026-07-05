import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChildProfiles } from "@/lib/parent.functions";
import { useSession } from "@/lib/session";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Plus, Settings, LogOut } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { next: location.href } });
  },
  component: HomeSelector,
});

function HomeSelector() {
  const navigate = useNavigate();
  const { setActiveChildId, signOut } = useSession();
  const { t } = useI18n();
  const list = useServerFn(listChildProfiles);
  const { data: kids = [], isLoading } = useQuery({ queryKey: ["kids"], queryFn: () => list() });

  const pickKid = (id: string) => {
    setActiveChildId(id);
    navigate({ to: "/kids/$childId", params: { childId: id } });
  };

  return (
    <div className="min-h-screen gradient-cool">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🦄</div>
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white">SafeTube Kids</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="secondary" className="rounded-full" onClick={() => navigate({ to: "/parent" })}>
              <Settings className="w-4 h-4 mr-1" /> {t("profile.parent")}
            </Button>
            <Button variant="ghost" className="rounded-full text-white hover:bg-white/10" onClick={() => signOut()}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>
        <h2 className="text-center text-3xl md:text-5xl font-display font-bold text-white mb-10">{t("profile.select")}</h2>
        {isLoading ? (
          <div className="text-center text-white/80">{t("common.loading")}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 justify-center">
            {kids.map((k) => (
              <button
                key={k.id}
                onClick={() => pickKid(k.id)}
                className="group rounded-3xl bg-white/95 hover:bg-white shadow-xl p-6 transition-transform hover:-translate-y-1 active:scale-95"
              >
                <div className="text-7xl md:text-8xl mb-3 transition-transform group-hover:scale-110">{k.avatar_emoji}</div>
                <div className="font-display font-bold text-lg text-foreground truncate">{k.profile_name}</div>
                {k.age && <div className="text-xs text-muted-foreground">{k.age} años</div>}
              </button>
            ))}
            <button
              onClick={() => navigate({ to: "/parent/children" })}
              className="rounded-3xl border-2 border-dashed border-white/70 text-white p-6 hover:bg-white/10 transition-colors"
            >
              <Plus className="w-12 h-12 mx-auto mb-2" />
              <div className="font-display font-bold">{t("profile.add")}</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Home, Tv, LayoutGrid, Heart, Search, LogOut, ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";

export function KidShell({ childId, child, children }: { childId: string; child?: { profile_name: string; avatar_emoji: string } | null; children: ReactNode }) {
  const { t } = useI18n();
  const { signOut } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/kids/$childId", label: t("nav.home"), icon: Home, exact: true },
    { to: "/kids/$childId/channels", label: t("nav.channels"), icon: Tv, exact: false },
    { to: "/kids/$childId/categories", label: t("nav.categories"), icon: LayoutGrid, exact: false },
    { to: "/kids/$childId/favorites", label: t("nav.favorites"), icon: Heart, exact: true },
    { to: "/kids/$childId/history", label: t("nav.history"), icon: History, exact: true },
  ] as const;

  const isActive = (to: string, exact: boolean) => {
    const resolved = to.replace("$childId", childId);
    return exact ? path === resolved : path.startsWith(resolved);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:sticky md:top-0 md:h-screen bg-sidebar border-r border-sidebar-border p-4">
        <Link to="/" className="flex items-center gap-2 px-2 py-3 mb-4">
          <span className="text-3xl">🦄</span>
          <span className="font-display font-bold text-lg text-sidebar-foreground">SafeTube</span>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                params={{ childId } as any}
                className={`flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold transition-colors ${active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <n.icon className="w-5 h-5" />
                {n.label}
              </Link>
            );
          })}
          <Link
            to="/parent"
            className="flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <Settings className="w-5 h-5" />
            {t("nav.parent")}
          </Link>
        </nav>
        {child && (
          <div className="mt-4 rounded-2xl bg-sidebar-accent p-3 text-center">
            <div className="text-3xl">{child.avatar_emoji}</div>
            <div className="font-display font-bold text-sm mt-1 text-sidebar-foreground">{child.profile_name}</div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <Link to="/" className="md:hidden text-2xl">🦄</Link>
          <Link
            to="/kids/$childId/search"
            params={{ childId } as any}
            className="flex-1 flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
          >
            <Search className="w-4 h-4" /> {t("search.placeholder")}
          </Link>
          <Link to="/kids/$childId/favorites" params={{ childId } as any} className="hidden sm:block">
            <Button variant="ghost" size="icon" className="rounded-full"><Heart className="w-5 h-5" /></Button>
          </Link>
          <LanguageSwitcher />
          <Link to="/">
            <Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex" onClick={() => signOut()}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-6">{children}</main>

        {/* Bottom nav - mobile */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around py-2">
          {nav.map((n) => {
            const active = isActive(n.to, n.exact);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                params={{ childId } as any}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <n.icon className="w-5 h-5" />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

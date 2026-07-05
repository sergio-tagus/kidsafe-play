import { Link, useRouterState } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { LanguageSwitcher } from "./language-switcher";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, ListChecks, LogOut, ArrowLeft, Tags } from "lucide-react";

export function ParentShell({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { signOut } = useSession();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const nav = [
    { to: "/parent", label: t("parent.overview"), icon: LayoutDashboard, exact: true },
    { to: "/parent/children", label: t("parent.children"), icon: Users, exact: false },
    { to: "/parent/whitelist", label: t("parent.whitelist"), icon: ListChecks, exact: false },
    { to: "/parent/categories", label: t("parent.categories"), icon: Tags, exact: false },
  ] as const;

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex md:w-64 md:flex-col md:sticky md:top-0 md:h-screen bg-sidebar border-r border-sidebar-border p-4">
        <Link to="/" className="flex items-center gap-2 px-2 py-3 mb-4">
          <span className="text-3xl">🦄</span>
          <div>
            <div className="font-display font-bold text-lg text-sidebar-foreground">SafeTube</div>
            <div className="text-xs text-muted-foreground">{t("parent.dashboard")}</div>
          </div>
        </Link>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to as any}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${active ? "bg-primary text-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <n.icon className="w-5 h-5" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2">
          <Link to="/">
            <Button variant="outline" className="w-full rounded-xl"><ArrowLeft className="w-4 h-4 mr-1" /> {t("common.back")}</Button>
          </Link>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center gap-2 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
          <Link to="/" className="md:hidden text-2xl">🦄</Link>
          <div className="flex-1" />
          <LanguageSwitcher />
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => signOut()}>
            <LogOut className="w-5 h-5" />
          </Button>
        </header>

        <div className="md:hidden border-b border-border overflow-x-auto">
          <div className="flex gap-1 p-2">
            {nav.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to as any}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold whitespace-nowrap ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                >
                  <n.icon className="w-4 h-4" /> {n.label}
                </Link>
              );
            })}
          </div>
        </div>

        <main className="flex-1 px-4 md:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}

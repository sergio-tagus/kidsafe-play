import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ParentShell } from "@/components/parent-shell";
import { useI18n } from "@/lib/i18n";
import { useIsSuperAdmin } from "@/hooks/use-superadmin";
import { searchUsers, startImpersonation } from "@/lib/impersonation.functions";
import { saveImpersonation } from "@/lib/impersonation";
import { markParentUnlocked } from "./route";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Search, UserCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/parent/impersonate")({
  component: ImpersonatePage,
});

function ImpersonatePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isSuperAdmin, isLoading } = useIsSuperAdmin();
  const search = useServerFn(searchUsers);
  const start = useServerFn(startImpersonation);
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(term), 300);
    return () => clearTimeout(id);
  }, [term]);

  useEffect(() => {
    if (!isLoading && !isSuperAdmin) navigate({ to: "/parent", replace: true });
  }, [isLoading, isSuperAdmin, navigate]);

  const { data, isFetching } = useQuery({
    queryKey: ["imp-users", debounced],
    queryFn: () => search({ data: { term: debounced } }),
    enabled: isSuperAdmin,
    staleTime: 30_000,
  });

  const impersonate = async (userId: string) => {
    setBusyId(userId);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const original = sess.session;
      if (!original) throw new Error("No active session");
      const res = await start({ data: { userId } });
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: res.tokenHash });
      if (error) throw new Error(error.message);
      saveImpersonation({
        logId: res.logId,
        target: { id: res.user.id, email: res.user.email, name: res.user.name },
        original: { access_token: original.access_token, refresh_token: original.refresh_token },
      });
      markParentUnlocked();
      window.location.href = "/parent";
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setBusyId(null);
    }
  };

  if (!isSuperAdmin) return null;

  const users = data?.users ?? [];

  return (
    <ParentShell>
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="font-display text-2xl font-bold">{t("imp.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("imp.subtitle")}</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={t("imp.searchPlaceholder")}
            className="rounded-xl pl-9"
          />
        </div>

        {isFetching && <p className="text-sm text-muted-foreground">{t("common.loading")}</p>}
        {!isFetching && users.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("imp.noResults")}</p>
        )}

        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="flex items-center gap-3 rounded-2xl p-3">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-bold">
                  {(u.name || u.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{u.name || "—"}</div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
              </div>
              <Button
                size="sm"
                className="rounded-full"
                disabled={busyId !== null}
                onClick={() => void impersonate(u.id)}
              >
                {busyId === u.id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <UserCheck className="mr-1 h-4 w-4" />
                )}
                {t("imp.action")}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </ParentShell>
  );
}

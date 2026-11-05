import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { handleParentActionError } from "@/lib/parent-locked";
import { dismissScreenTimeAlert, extendScreenTime, listScreenTimeAlerts } from "@/lib/screen-time-alerts.functions";

export const ALERTS_KEY = ["screen-time-alerts"];

export function useScreenTimeAlerts() {
  const listFn = useServerFn(listScreenTimeAlerts);
  return useQuery({ queryKey: ALERTS_KEY, queryFn: () => listFn(), refetchInterval: 30_000 });
}

export function ScreenTimeAlertsBadge() {
  const { data = [] } = useScreenTimeAlerts();
  if (!data.length) return null;
  return (
    <span className="relative inline-flex items-center" aria-label={`${data.length}`}>
      <Bell className="w-5 h-5" />
      <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
        {data.length}
      </span>
    </span>
  );
}

export function ScreenTimeAlertsCard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { data = [] } = useScreenTimeAlerts();
  const extendFn = useServerFn(extendScreenTime);
  const dismissFn = useServerFn(dismissScreenTimeAlert);
  const done = () => { qc.invalidateQueries({ queryKey: ALERTS_KEY }); qc.invalidateQueries({ queryKey: ["stats"] }); };
  const extend = useMutation({
    mutationFn: (alertId: string) => extendFn({ data: { alertId } }),
    onSuccess: () => { toast.success(t("alerts.extended")); done(); },
    onError: handleParentActionError,
  });
  const dismiss = useMutation({
    mutationFn: (alertId: string) => dismissFn({ data: { alertId } }),
    onSuccess: done,
    onError: handleParentActionError,
  });
  if (!data.length) return null;
  return (
    <div className="space-y-3 mb-6">
      {data.map((a) => (
        <Card key={a.id} className="border-destructive/50">
          <CardContent className="py-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl">{a.emoji}</span>
            <div className="flex-1 min-w-48">
              <div className="font-semibold">{t("alerts.title").replace("{name}", a.name)}</div>
              <div className="text-sm text-muted-foreground">{t("alerts.desc")}</div>
            </div>
            <Button onClick={() => extend.mutate(a.id)} disabled={extend.isPending}>{t("alerts.extend")}</Button>
            <Button variant="outline" onClick={() => dismiss.mutate(a.id)} disabled={dismiss.isPending}>{t("alerts.dismiss")}</Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

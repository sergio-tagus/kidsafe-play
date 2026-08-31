import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getApiUsageSummary,
  getApiUsageByChannel,
  listSyncRuns,
  setQuotaSettings,
} from "@/lib/api-usage.functions";
import { ParentShell } from "@/components/parent-shell";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parent/api-usage")({
  component: ApiUsagePage,
  head: () => ({
    meta: [
      { title: "Consumo de la API de YouTube | SafeTube Kids" },
      {
        name: "description",
        content:
          "Monitoriza las unidades de la API de YouTube que consume SafeTube Kids: uso diario, desglose por operación y por canal.",
      },
      { property: "og:title", content: "Consumo de la API de YouTube | SafeTube Kids" },
      {
        property: "og:description",
        content: "Uso diario, cuota restante y detalle por canal del consumo de la API de YouTube.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const OP_LABEL: Record<string, string> = {
  search: "search",
  channels: "channels",
  playlistItems: "playlistItems",
  videos: "videos",
};

function ApiUsagePage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const summaryFn = useServerFn(getApiUsageSummary);
  const byChannelFn = useServerFn(getApiUsageByChannel);
  const runsFn = useServerFn(listSyncRuns);
  const saveQuotaFn = useServerFn(setQuotaSettings);

  const [days, setDays] = useState(7);

  const { data: summary } = useQuery({
    queryKey: ["api-usage", days],
    queryFn: () => summaryFn({ data: { days } }),
  });
  const { data: byChannel = [] } = useQuery({
    queryKey: ["api-usage-channels"],
    queryFn: () => byChannelFn(),
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["api-usage-runs"],
    queryFn: () => runsFn({ data: { limit: 20 } }),
  });

  const [quotaInput, setQuotaInput] = useState("");
  useEffect(() => {
    if (summary?.dailyQuota != null) setQuotaInput(String(summary.dailyQuota));
  }, [summary?.dailyQuota]);

  const quota = summary?.dailyQuota ?? 10000;
  const todayUnits = summary?.todayUnits ?? 0;
  const pct = quota > 0 ? Math.min(100, Math.round((todayUnits / quota) * 100)) : 0;
  const tone = pct >= 100 ? "text-destructive" : pct >= 80 ? "text-amber-600" : "text-foreground";

  const saveQuota = async () => {
    const n = Number(quotaInput);
    if (!Number.isFinite(n) || n < 100) {
      toast.error("100+");
      return;
    }
    try {
      await saveQuotaFn({ data: { dailyQuota: Math.round(n) } });
      toast.success(t("parent.apiQuotaSaved"));
      qc.invalidateQueries({ queryKey: ["api-usage"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  const sourceLabel = (s: string) =>
    s === "cron" ? t("parent.apiSourceCron") : s === "bulk" ? t("parent.apiSourceBulk") : t("parent.apiSourceManual");

  const fmt = (n: number) => n.toLocaleString(lang);

  return (
    <ParentShell>
      <h1 className="text-3xl font-display font-bold mb-6">{t("parent.apiUsageTitle")}</h1>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="md:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-sm text-muted-foreground">{t("parent.apiToday")}</div>
                <div className={`text-3xl font-display font-bold ${tone}`}>
                  {fmt(todayUnits)}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    / {fmt(quota)} {t("parent.apiUnits")}
                  </span>
                </div>
              </div>
              <div className={`text-2xl font-bold ${tone}`}>{pct}%</div>
            </div>
            <Progress value={pct} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 space-y-2">
            <Label htmlFor="quota">{t("parent.apiQuota")}</Label>
            <div className="flex gap-2">
              <Input
                id="quota"
                inputMode="numeric"
                value={quotaInput}
                onChange={(e) => setQuotaInput(e.target.value.replace(/[^\d]/g, ""))}
              />
              <Button onClick={saveQuota}>{t("parent.apiSaveQuota")}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("parent.apiNote")}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold">{t("parent.apiHistory")}</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={days === 7 ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setDays(7)}
              >
                {t("parent.apiLast7")}
              </Button>
              <Button
                size="sm"
                variant={days === 30 ? "default" : "outline"}
                className="rounded-full"
                onClick={() => setDays(30)}
              >
                {t("parent.apiLast30")}
              </Button>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary?.byDay ?? []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="day"
                  tickFormatter={(d: string) => d.slice(5)}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip
                  formatter={(v: any) => [`${fmt(Number(v))} ${t("parent.apiUnits")}`, ""]}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Bar dataKey="units" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display font-bold mb-3">{t("parent.apiByOperation")}</h2>
            {(summary?.byOperation ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("parent.apiNoData")}</div>
            ) : (
              <ul className="space-y-2">
                {(summary?.byOperation ?? []).map((o) => (
                  <li key={o.operation} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{OP_LABEL[o.operation] ?? o.operation}</span>
                    <span className="text-muted-foreground">
                      {fmt(o.units)} {t("parent.apiUnits")} · {fmt(o.calls)} {t("parent.apiCalls")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-display font-bold mb-3">{t("parent.apiByChannel")}</h2>
            {(byChannel as any[]).filter((c) => c.units > 0).length === 0 ? (
              <div className="text-sm text-muted-foreground">{t("parent.apiNoData")}</div>
            ) : (
              <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {(byChannel as any[])
                  .filter((c) => c.units > 0)
                  .map((c) => (
                    <li key={c.id} className="flex items-center gap-3 text-sm">
                      {c.channel_thumbnail_url ? (
                        <img src={c.channel_thumbnail_url} alt={c.channel_name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">📺</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{c.channel_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.last_synced_at
                            ? new Date(c.last_synced_at).toLocaleString(lang)
                            : t("parent.neverSynced")}
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap text-muted-foreground">
                        {fmt(c.units)} {t("parent.apiUnits")}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="font-display font-bold mb-3">{t("parent.apiRuns")}</h2>
          {(runs as any[]).length === 0 ? (
            <div className="text-sm text-muted-foreground">{t("parent.apiNoData")}</div>
          ) : (
            <ul className="divide-y divide-border">
              {(runs as any[]).map((r) => (
                <li key={r.id} className="py-3 flex items-center gap-3 flex-wrap text-sm">
                  <Badge variant="secondary">{sourceLabel(r.source)}</Badge>
                  <span className="text-muted-foreground">
                    {new Date(r.started_at).toLocaleString(lang)}
                  </span>
                  <span className="ml-auto text-muted-foreground">
                    {fmt(r.channels_processed)} {t("parent.apiChannels")} · {fmt(r.videos_imported)}{" "}
                    {t("parent.apiVideos")} · {fmt(r.units_used)} {t("parent.apiUnits")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </ParentShell>
  );
}

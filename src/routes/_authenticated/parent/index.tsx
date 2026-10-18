import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getParentStats } from "@/lib/kids.functions";
import { getSyncSettings, upsertSyncSettings } from "@/lib/sync.functions";
import { listCategories } from "@/lib/categories.functions";
import { ParentShell } from "@/components/parent-shell";
import { OnboardingResumeBanner } from "@/components/onboarding-tour";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";
import { getForcedResolution, setForcedResolution, readDisplayInfo, type ForcedResolution } from "@/lib/display-scale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { useIsSuperAdmin } from "@/hooks/use-superadmin";

export const Route = createFileRoute("/_authenticated/parent/")({
  component: ParentDashboard,
});

const COLORS = ["oklch(0.68 0.22 20)", "oklch(0.72 0.18 150)", "oklch(0.68 0.17 240)", "oklch(0.75 0.18 55)", "oklch(0.65 0.24 300)", "oklch(0.75 0.2 350)", "oklch(0.87 0.17 95)", "oklch(0.6 0.15 200)"];

function ParentDashboard() {
  const { t, lang } = useI18n();
  const statsFn = useServerFn(getParentStats);
  const catsFn = useServerFn(listCategories);
  const { data } = useQuery({ queryKey: ["stats"], queryFn: () => statsFn() });
  const { data: cats = [] } = useQuery<any[]>({ queryKey: ["categories"], queryFn: () => catsFn() as any });

  const days = data?.days ?? [];
  const week = days.slice(-7).map(d => ({ ...d, day: d.date.slice(5) }));
  const month = days.map(d => ({ ...d, day: d.date.slice(5) }));
  const catLabel = (slug: string) => {
    const c = cats.find((x) => x.slug === slug);
    if (!c) return slug;
    return lang === "es" ? c.name_es : lang === "pt" ? c.name_pt : c.name_en;
  };
  const catData = (data?.topCategories ?? []).map((c) => ({ ...c, label: catLabel(c.name) }));

  return (
    <ParentShell>
      <OnboardingResumeBanner />
      <h1 data-tour="overview" className="text-3xl font-display font-bold mb-6">{t("parent.dashboard")}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t("parent.today")} value={`${data?.totals.today ?? 0}`} unit="min" />
        <StatCard label={t("parent.week")} value={`${data?.totals.week ?? 0}`} unit="min" />
        <StatCard label={t("parent.month")} value={`${data?.totals.total ?? 0}`} unit="min" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>{t("parent.week")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <BarChart data={week}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="minutes" fill="oklch(0.65 0.24 300)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("parent.month")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer>
              <LineChart data={month}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="oklch(0.68 0.17 240)" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader><CardTitle>{t("parent.topCategories")}</CardTitle></CardHeader>
          <CardContent className="h-64">
            {catData.length === 0 ? <div className="text-muted-foreground text-sm">—</div> : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={catData} dataKey="views" nameKey="label" innerRadius={40} outerRadius={80} label>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t("parent.topChannels")}</CardTitle></CardHeader>
          <CardContent>
            {(data?.topChannels ?? []).length === 0 ? <div className="text-muted-foreground text-sm">—</div> : (
              <ul className="space-y-2">
                {data!.topChannels.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between border-b border-border last:border-0 py-2">
                    <div className="flex items-center gap-3"><span className="w-6 text-muted-foreground font-mono">#{i + 1}</span><span className="font-semibold">{c.name}</span></div>
                    <span className="text-sm text-muted-foreground">{c.views} views</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>{t("parent.topVideos")}</CardTitle></CardHeader>
        <CardContent>
          {(data?.topVideos ?? []).length === 0 ? <div className="text-muted-foreground text-sm">—</div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data!.topVideos.map((v) => (
                <div key={v.youtube_video_id} className="flex items-center gap-3 rounded-xl bg-muted/50 p-2">
                  {v.thumbnail_url && <img src={v.thumbnail_url} alt="" className="w-20 h-14 rounded-md object-cover" />}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold line-clamp-2">{v.title}</div>
                    <div className="text-xs text-muted-foreground">{v.views} views</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DisplayCard />
      <SyncSettingsCard />
    </ParentShell>
  );
}

function SyncSettingsCard() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const { isSuperAdmin } = useIsSuperAdmin();
  const getFn = useServerFn(getSyncSettings);
  const saveFn = useServerFn(upsertSyncSettings);
  const { data: s } = useQuery({
    queryKey: ["sync-settings"],
    queryFn: () => getFn(),
    enabled: isSuperAdmin,
  });
  const freq = s?.frequency ?? "biweekly";

  const save = async (v: string) => {
    try {
      await saveFn({ data: { frequency: v as any } });
      toast.success(t("parent.syncSaved"));
      qc.invalidateQueries({ queryKey: ["sync-settings"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  if (!isSuperAdmin) return null;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{t("parent.syncSettings")}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{t("parent.syncDesc")}</p>
        <Select value={freq} onValueChange={save}>
          <SelectTrigger className="w-full sm:w-72 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="off">{t("parent.syncOff")}</SelectItem>
            <SelectItem value="biweekly">{t("parent.syncBiweekly")}</SelectItem>
          </SelectContent>
        </Select>
        {(s as any)?.auto_paused && (
          <div className="text-xs text-amber-600 mt-3">{t("parent.syncPaused")}</div>
        )}
        <div className="text-xs text-muted-foreground mt-3">
          {t("parent.syncLastRun")}:{" "}
          {s?.last_run_at ? new Date(s.last_run_at).toLocaleString() : t("parent.syncNever")}
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-2 text-4xl font-display font-bold">{value}<span className="text-lg ml-1 text-muted-foreground">{unit}</span></div>
      </CardContent>
    </Card>
  );
}

function DisplayCard() {
  const { t } = useI18n();
  const [res, setRes] = useState<ForcedResolution>("auto");
  const [info, setInfo] = useState<ReturnType<typeof readDisplayInfo> | null>(null);
  useEffect(() => {
    setRes(getForcedResolution());
    const upd = () => setInfo(readDisplayInfo());
    upd();
    window.addEventListener("resize", upd);
    return () => window.removeEventListener("resize", upd);
  }, []);
  const change = (v: string) => {
    setForcedResolution(v as ForcedResolution);
    setRes(v as ForcedResolution);
    setTimeout(() => setInfo(readDisplayInfo()), 50);
  };
  return (
    <Card className="mt-6">
      <CardHeader><CardTitle>{t("display.title")}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {info && (
          <div className="text-sm space-y-1">
            <div><span className="text-muted-foreground">{t("display.current")}:</span> <span className="font-semibold">{info.screenW}×{info.screenH}</span> · {info.dpr}×</div>
            <div><span className="text-muted-foreground">{t("display.viewport")}:</span> {info.viewW}×{info.viewH}</div>
          </div>
        )}
        <div>
          <div className="text-sm font-semibold mb-2">{t("display.force")}</div>
          <Select value={res} onValueChange={change}>
            <SelectTrigger className="w-full sm:w-72 rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">{t("display.auto")}</SelectItem>
              <SelectItem value="720">720p (1280×720)</SelectItem>
              <SelectItem value="1080">1080p (1920×1080)</SelectItem>
              <SelectItem value="2160">4K (3840×2160)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">{t("display.note")}</p>
        </div>
      </CardContent>
    </Card>
  );
}

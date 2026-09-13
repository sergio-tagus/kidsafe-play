import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { listChildProfiles } from "@/lib/parent.functions";
import { listHistory } from "@/lib/kids.functions";
import { ParentShell } from "@/components/parent-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/parent/history")({
  component: ParentHistory,
});

function ParentHistory() {
  const { t } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const histFn = useServerFn(listHistory);

  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (!selected && kids.length > 0) setSelected(kids[0].id);
  }, [kids, selected]);

  const { data: hist = [] } = useQuery({
    queryKey: ["parent-hist", selected],
    queryFn: () => histFn({ data: { childId: selected, limit: 60 } }),
    enabled: !!selected,
  });

  const videos = hist.map((h) => h.video).filter(Boolean) as any[];

  return (
    <ParentShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 data-tour="history" className="text-2xl md:text-3xl font-display font-bold">{t("parent.history")}</h1>
        {kids.length > 0 && (
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {kids.map((k: any) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.avatar_emoji} {k.profile_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!selected ? (
        <div className="text-center py-20 text-muted-foreground">{t("common.loading")}</div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">📼 {t("history.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((v, i) => (
            <VideoCard key={`${v.id}-${i}`} video={v} childId={selected} />
          ))}
        </div>
      )}
    </ParentShell>
  );
}

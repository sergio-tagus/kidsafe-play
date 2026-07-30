import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listChildProfiles } from "@/lib/parent.functions";
import { listSafeVideos, listApprovedChannels } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/kids/$childId/search")({
  component: SearchPage,
});

function SearchPage() {
  const { childId } = Route.useParams();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const kidsFn = useServerFn(listChildProfiles);
  const searchFn = useServerFn(listSafeVideos);
  const channelsFn = useServerFn(listApprovedChannels);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;
  const { data: channels = [] } = useQuery({ queryKey: ["approved-channels"], queryFn: () => channelsFn() });
  const active = q.trim().length > 0 || !!channelId;
  const { data: results = [] } = useQuery({
    queryKey: ["search", childId, q, channelId],
    queryFn: () =>
      searchFn({ data: { childId, filter: "search", query: q, channelId: channelId ?? undefined, limit: 40 } }),
    enabled: active,
  });

  return (
    <KidShell childId={childId} child={child}>
      <div className="max-w-2xl mx-auto mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search.placeholder")}
            className="pl-12 h-14 rounded-full text-lg"
          />
        </div>
      </div>

      {channels.length > 0 && (
        <div className="mb-6 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 w-max pb-2">
            <button
              type="button"
              onClick={() => setChannelId(null)}
              className={cn(
                "px-4 h-11 rounded-full text-sm font-semibold border-2 transition-colors shrink-0",
                channelId === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary/50",
              )}
            >
              {t("search.allChannels")}
            </button>
            {channels.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChannelId((prev) => (prev === c.id ? null : c.id))}
                className={cn(
                  "flex items-center gap-2 pl-1.5 pr-4 h-11 rounded-full text-sm font-semibold border-2 transition-colors shrink-0 max-w-[15rem]",
                  channelId === c.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50",
                )}
              >
                {c.channel_thumbnail_url ? (
                  <img
                    src={c.channel_thumbnail_url}
                    alt=""
                    loading="lazy"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">📺</span>
                )}
                <span className="truncate">{c.channel_name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {active && results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">🔎 {t("search.noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((v) => <VideoCard key={v.id} video={v} childId={childId} />)}
        </div>
      )}
    </KidShell>
  );
}

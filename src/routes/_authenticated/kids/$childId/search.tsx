import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listChildProfiles } from "@/lib/parent.functions";
import { listSafeVideos } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/kids/$childId/search")({
  component: SearchPage,
});

function SearchPage() {
  const { childId } = Route.useParams();
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const kidsFn = useServerFn(listChildProfiles);
  const searchFn = useServerFn(listSafeVideos);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;
  const { data: results = [] } = useQuery({
    queryKey: ["search", childId, q],
    queryFn: () => searchFn({ data: { childId, filter: "search", query: q, limit: 40 } }),
    enabled: q.trim().length > 0,
  });

  return (
    <KidShell childId={childId} child={child}>
      <div className="max-w-2xl mx-auto mb-6">
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
      {q.trim() && results.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">🔎 {t("search.noResults")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((v) => <VideoCard key={v.id} video={v} childId={childId} />)}
        </div>
      )}
    </KidShell>
  );
}

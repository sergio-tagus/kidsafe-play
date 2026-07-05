import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChildProfiles } from "@/lib/parent.functions";
import { listSafeVideos } from "@/lib/kids.functions";
import { listCategories } from "@/lib/categories.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kids/$childId/categories/$category")({
  component: CategoryPage,
});

function CategoryPage() {
  const { childId, category } = Route.useParams();
  const { t, lang } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const videosFn = useServerFn(listSafeVideos);
  const catsFn = useServerFn(listCategories);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const { data: cats = [] } = useQuery<any[]>({ queryKey: ["categories"], queryFn: () => catsFn() as any });
  const child = kids.find((k: any) => k.id === childId) ?? null;
  const { data: videos = [] } = useQuery({
    queryKey: ["cat", childId, category],
    queryFn: () => videosFn({ data: { childId, filter: "byCategory", category, limit: 40 } }),
  });
  const cat = cats.find((c: any) => c.slug === category);
  const title = cat ? (lang === "es" ? cat.name_es : lang === "pt" ? cat.name_pt : cat.name_en) : category;

  return (
    <KidShell childId={childId} child={child}>
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-6">{title}</h1>
      {videos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t("home.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {videos.map((v) => <VideoCard key={v.id} video={v} childId={childId} />)}
        </div>
      )}
    </KidShell>
  );
}


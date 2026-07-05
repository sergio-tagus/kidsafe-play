import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChildProfiles } from "@/lib/parent.functions";
import { listFavorites } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kids/$childId/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { childId } = Route.useParams();
  const { t } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const favFn = useServerFn(listFavorites);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;
  const { data: favs = [] } = useQuery({ queryKey: ["favs", childId], queryFn: () => favFn({ data: { childId } }) });

  return (
    <KidShell childId={childId} child={child}>
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-4">{t("favorites.title")}</h1>
      {favs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">💖 {t("favorites.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {favs.map((v) => <VideoCard key={v.id} video={v} childId={childId} />)}
        </div>
      )}
    </KidShell>
  );
}

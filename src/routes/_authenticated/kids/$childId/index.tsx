import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChildProfiles } from "@/lib/parent.functions";
import { listSafeVideos, listContinueWatching, listApprovedChannels } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoRow } from "@/components/video-card";
import { useI18n } from "@/lib/i18n";
import { Link } from "@tanstack/react-router";
import { youtubeThumb } from "@/lib/youtube";

export const Route = createFileRoute("/_authenticated/kids/$childId/")({
  component: KidHome,
});

function KidHome() {
  const { childId } = Route.useParams();
  const { t } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const videosFn = useServerFn(listSafeVideos);
  const contFn = useServerFn(listContinueWatching);
  const chFn = useServerFn(listApprovedChannels);

  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;

  const { data: cont = [] } = useQuery({ queryKey: ["cw", childId], queryFn: () => contFn({ data: { childId } }) });
  const { data: recent = [] } = useQuery({ queryKey: ["recent", childId], queryFn: () => videosFn({ data: { childId, filter: "recent", limit: 12 } }) });
  const { data: reco = [] } = useQuery({ queryKey: ["reco", childId], queryFn: () => videosFn({ data: { childId, filter: "recommended", limit: 12 } }) });
  const { data: pop = [] } = useQuery({ queryKey: ["pop", childId], queryFn: () => videosFn({ data: { childId, filter: "popular", limit: 12 } }) });
  const { data: channels = [] } = useQuery({ queryKey: ["chs"], queryFn: () => chFn() });

  const anyContent = cont.length || recent.length || reco.length || pop.length || channels.length;

  return (
    <KidShell childId={childId} child={child}>
      {!anyContent ? (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🎈</div>
          <h2 className="text-2xl font-display font-bold">{t("home.empty")}</h2>
        </div>
      ) : (
        <>
          <VideoRow title={t("home.continueWatching")} videos={cont} childId={childId} />
          <VideoRow title={t("home.recommended")} videos={reco} childId={childId} />
          <VideoRow title={t("home.newVideos")} videos={recent} childId={childId} />
          <VideoRow title={t("home.popular")} videos={pop} childId={childId} />
          {channels.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl md:text-2xl font-display font-bold mb-3">{t("home.recentChannels")}</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {channels.slice(0, 12).map((c: any) => (
                  <Link
                    key={c.id}
                    to="/kids/$childId/channels/$channelId"
                    params={{ childId, channelId: c.id } as any}
                    className="flex-shrink-0 text-center w-24"
                  >
                    <div className="w-20 h-20 mx-auto rounded-full bg-muted overflow-hidden shadow">
                      {c.channel_thumbnail_url ? (
                        <img src={c.channel_thumbnail_url} alt={c.channel_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📺</div>
                      )}
                    </div>
                    <div className="mt-2 text-xs font-semibold truncate">{c.channel_name}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </KidShell>
  );
}

export { youtubeThumb };

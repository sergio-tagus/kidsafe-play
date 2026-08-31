import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listChildProfiles } from "@/lib/parent.functions";
import { listSafeVideos, listApprovedChannels } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { VideoCard } from "@/components/video-card";
import { sanitizeDescription } from "@/lib/sanitize-text";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kids/$childId/channels/$channelId")({
  component: ChannelPage,
});

function ChannelPage() {
  const { childId, channelId } = Route.useParams();
  const { t } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const chFn = useServerFn(listApprovedChannels);
  const videosFn = useServerFn(listSafeVideos);

  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;
  const { data: channels = [] } = useQuery({ queryKey: ["chs"], queryFn: () => chFn() });
  const channel = channels.find((c: any) => c.id === channelId);
  const { data: videos = [] } = useQuery({
    queryKey: ["ch-vids", childId, channelId],
    queryFn: () => videosFn({ data: { childId, filter: "byChannel", channelId, limit: 40 } }),
  });
  const [descOpen, setDescOpen] = useState(false);
  const channelDescription = useMemo(
    () => sanitizeDescription((channel as any)?.channel_description),
    [channel],
  );



  return (
    <KidShell childId={childId} child={child}>
      <div className="flex items-start gap-4 mb-6">
        {channel?.channel_thumbnail_url ? (
          <img src={channel.channel_thumbnail_url} alt={channel.channel_name} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">📺</div>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display font-bold">{channel?.channel_name ?? ""}</h1>
          {channel && <div className="text-sm text-muted-foreground">{t(`categories.${channel.category}` as any)}</div>}
          {channelDescription && (
            <div className="mt-2 max-w-3xl">
              <p className={`text-sm text-foreground/80 whitespace-pre-wrap ${descOpen ? "" : "line-clamp-3"}`}>
                {channelDescription}
              </p>
              <button
                type="button"
                className="mt-1 text-sm font-semibold text-primary hover:underline"
                onClick={() => setDescOpen((v) => !v)}
              >
                {descOpen ? t("common.showLess") : t("common.showMore")}
              </button>
            </div>
          )}
        </div>
      </div>
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

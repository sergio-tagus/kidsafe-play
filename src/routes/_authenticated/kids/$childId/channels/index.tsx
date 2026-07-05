import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChildProfiles } from "@/lib/parent.functions";
import { listApprovedChannels } from "@/lib/kids.functions";
import { KidShell } from "@/components/kid-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kids/$childId/channels/")({
  component: ChannelsPage,
});

function ChannelsPage() {
  const { childId } = Route.useParams();
  const { t } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const chFn = useServerFn(listApprovedChannels);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;
  const { data: channels = [] } = useQuery({ queryKey: ["chs"], queryFn: () => chFn() });

  return (
    <KidShell childId={childId} child={child}>
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-4">{t("channels.title")}</h1>
      {channels.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">📺 {t("channels.empty")}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
          {channels.map((c: any) => (
            <Link
              key={c.id}
              to="/kids/$childId/channels/$channelId"
              params={{ childId, channelId: c.id } as any}
              className="rounded-2xl bg-card hover:shadow-lg transition-all p-4 text-center"
            >
              <div className="w-20 h-20 mx-auto rounded-full bg-muted overflow-hidden">
                {c.channel_thumbnail_url
                  ? <img src={c.channel_thumbnail_url} alt={c.channel_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-3xl">📺</div>}
              </div>
              <div className="mt-2 font-display font-bold text-sm truncate">{c.channel_name}</div>
              <div className="text-xs text-muted-foreground">{t(`categories.${c.category}` as any)}</div>
            </Link>
          ))}
        </div>
      )}
    </KidShell>
  );
}

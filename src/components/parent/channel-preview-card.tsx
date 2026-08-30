import { Card, CardContent } from "@/components/ui/card";
import type { ChannelPreview } from "@/lib/domain-types";
import { useI18n } from "@/lib/i18n";

export function ChannelPreviewCard({ preview }: { preview: ChannelPreview }) {
  const { t } = useI18n();
  return (
    <Card>
      <CardContent className="p-4 flex gap-3">
        {preview.channel_thumbnail_url && (
          <img
            src={preview.channel_thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            width={64}
            height={64}
            className="w-16 h-16 rounded-full object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate">{preview.channel_name}</div>
          {preview.channel_handle && <div className="text-xs text-muted-foreground">@{preview.channel_handle}</div>}
          <div className="text-xs text-muted-foreground mt-1">
            {Number(preview.subscriberCount).toLocaleString()} {t("parent.subscribers")} · {preview.videoCount} videos
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

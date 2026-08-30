import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CategorySelect } from "@/components/parent/category-select";
import type { Category, WhitelistChannel } from "@/lib/domain-types";
import { useI18n } from "@/lib/i18n";

type Props = {
  channel: WhitelistChannel;
  categories: Category[];
  refreshing: boolean;
  onCategoryChange: (slug: string) => void;
  onToggleActive: () => void;
  onRefresh: () => void;
  onRemove: () => void;
};

export function ChannelCard({
  channel,
  categories,
  refreshing,
  onCategoryChange,
  onToggleActive,
  onRefresh,
  onRemove,
}: Props) {
  const { t } = useI18n();

  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        {channel.channel_thumbnail_url ? (
          <img
            src={channel.channel_thumbnail_url}
            alt=""
            loading="lazy"
            decoding="async"
            width={56}
            height={56}
            className="w-14 h-14 rounded-full object-cover"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl" aria-hidden="true">
            📺
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-display font-bold truncate">{channel.channel_name}</div>
          {channel.channel_handle && (
            <div className="text-xs text-muted-foreground truncate">@{channel.channel_handle}</div>
          )}
          <CategorySelect
            categories={categories}
            value={channel.category ?? ""}
            onChange={onCategoryChange}
            className="h-7 mt-1 text-xs w-auto min-w-[8rem]"
            placeholder={t("parent.category")}
          />
        </div>
        <Switch
          checked={channel.active}
          onCheckedChange={onToggleActive}
          aria-label={`${t("parent.active")} — ${channel.channel_name}`}
        />
        <Button
          variant="ghost"
          size="icon"
          disabled={refreshing}
          onClick={onRefresh}
          title={t("parent.sync")}
          aria-label={t("parent.sync")}
        >
          {refreshing ? (
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          )}
        </Button>
        <Link to="/parent/whitelist/$channelId" params={{ channelId: channel.id }}>
          <Button variant="ghost" size="icon" aria-label={channel.channel_name}>
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </Button>
        </Link>
        <Button variant="ghost" size="icon" onClick={onRemove} aria-label={t("common.confirmDelete")}>
          <Trash2 className="w-4 h-4 text-destructive" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  );
}

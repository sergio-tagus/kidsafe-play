import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { ParentShell } from "@/components/parent-shell";
import { Button } from "@/components/ui/button";
import { ChannelCard } from "@/components/parent/channel-card";
import { AddChannelDialog } from "@/components/parent/add-channel-dialog";
import { ManualChannelDialog, type ManualChannelInput } from "@/components/parent/manual-channel-dialog";
import { RecommendationsDialog } from "@/components/parent/recommendations-dialog";
import { useCategories, useWhitelist, errorMessage } from "@/hooks/use-whitelist";
import { recommendChannels } from "@/lib/recommendations.functions";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/parent/whitelist/")({
  head: () => ({
    meta: [
      { title: "Canales aprobados — SafeTube Kids" },
      { name: "description", content: "Gestiona la lista blanca de canales de YouTube aprobados para tus hijos." },
      { property: "og:title", content: "Canales aprobados — SafeTube Kids" },
      { property: "og:description", content: "Gestiona la lista blanca de canales aprobados." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WhitelistPage,
});

function WhitelistPage() {
  const { t, lang } = useI18n();
  const { categories, nameOf } = useCategories();
  const {
    channels,
    invalidate,
    upsert,
    remove: removeFn,
    preview: previewFn,
    importChannel: importFn,
    refresh: refreshFn,
    updateCategory: updateCatFn,
  } = useWhitelist();
  const recommendFn = useServerFn(recommendChannels);

  const [autoOpen, setAutoOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [recOpen, setRecOpen] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const lookupChannel = async (url: string) => previewFn({ data: { url } });
  const importChannel = async (url: string, category: string) =>
    importFn({ data: { url, category: category as never } });

  const fetchRecommendations = async (force: boolean) => {
    const res = (await recommendFn({ data: { lang, force } })) as {
      items?: Awaited<ReturnType<typeof recommendChannels>>["items"];
      empty?: boolean;
    };
    return { items: res.items ?? [], empty: !!res.empty };
  };

  const saveManual = async (channel: ManualChannelInput) => {
    await upsert({ data: channel });
    toast.success(t("parent.saved"));
    invalidate();
  };

  const changeCategory = async (channelId: string, category: string) => {
    try {
      await updateCatFn({ data: { channelId, category } });
      toast.success(t("parent.categoryUpdated"));
      invalidate();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  const doRefresh = async (channelId: string) => {
    setRefreshingId(channelId);
    try {
      const res = await refreshFn({ data: { channelId } });
      toast.success(t("parent.syncDone", { n: res.videosImported }));
      invalidate();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    } finally {
      setRefreshingId(null);
    }
  };

  const toggleActive = async (channel: (typeof channels)[number]) => {
    await upsert({ data: { ...channel, active: !channel.active } });
    invalidate();
  };

  const removeChannel = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await removeFn({ data: { id } });
    invalidate();
  };

  return (
    <ParentShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-display font-bold">{t("parent.whitelist")}</h1>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => setRecOpen(true)}
            disabled={channels.length === 0}
          >
            <Sparkles className="w-4 h-4 mr-1" aria-hidden="true" /> {t("whitelist.recommend")}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={() => setManualOpen(true)}>
            {t("parent.manualAdd")}
          </Button>
          <Button className="rounded-full" onClick={() => setAutoOpen(true)}>
            <Plus className="w-4 h-4 mr-1" aria-hidden="true" /> {t("parent.addChannel")}
          </Button>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t("parent.noChannels")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              categories={categories}
              refreshing={refreshingId === c.id}
              onCategoryChange={(slug) => changeCategory(c.id, slug)}
              onToggleActive={() => toggleActive(c)}
              onRefresh={() => doRefresh(c.id)}
              onRemove={() => removeChannel(c.id)}
            />
          ))}
        </div>
      )}

      <AddChannelDialog
        open={autoOpen}
        onOpenChange={setAutoOpen}
        categories={categories}
        lookupChannel={lookupChannel}
        importChannel={importChannel}
        onImported={invalidate}
      />

      <ManualChannelDialog
        open={manualOpen}
        onOpenChange={setManualOpen}
        categories={categories}
        onSave={saveManual}
      />

      <RecommendationsDialog
        open={recOpen}
        onOpenChange={setRecOpen}
        categories={categories}
        categoryName={nameOf}
        fetchRecommendations={fetchRecommendations}
        lookupChannel={lookupChannel}
        importChannel={importChannel}
        onImported={invalidate}
      />
    </ParentShell>
  );
}

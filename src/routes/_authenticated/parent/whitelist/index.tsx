import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  listWhitelistChannels,
  upsertWhitelistChannel,
  deleteWhitelistChannel,
  previewChannelFromUrl,
  importChannelFromUrl,
  refreshChannelVideos,
  updateChannelCategory,
} from "@/lib/parent.functions";
import { listCategories } from "@/lib/categories.functions";
import { recommendChannels, type ChannelRecommendation } from "@/lib/recommendations.functions";
import { ParentShell } from "@/components/parent-shell";
import { useI18n } from "@/lib/i18n";
import { parseYouTubeChannel } from "@/lib/youtube";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ExternalLink, Search, RefreshCw, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parent/whitelist/")({
  component: WhitelistPage,
});

function WhitelistPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listWhitelistChannels);
  const upsertFn = useServerFn(upsertWhitelistChannel);
  const delFn = useServerFn(deleteWhitelistChannel);
  const previewFn = useServerFn(previewChannelFromUrl);
  const importFn = useServerFn(importChannelFromUrl);
  const refreshFn = useServerFn(refreshChannelVideos);
  const updateCatFn = useServerFn(updateChannelCategory);
  const catsFn = useServerFn(listCategories);
  const recommendFn = useServerFn(recommendChannels);

  const { data: channels = [] } = useQuery({ queryKey: ["wl"], queryFn: () => listFn() });
  const { data: categories = [] } = useQuery<any[]>({ queryKey: ["categories"], queryFn: () => catsFn() as any });
  const catName = (slug: string) => {
    const c = categories.find((x) => x.slug === slug);
    if (!c) return slug;
    return lang === "es" ? c.name_es : lang === "pt" ? c.name_pt : c.name_en;
  };

  const [autoOpen, setAutoOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<any>(null);

  // Auto-import state
  const [urlInput, setUrlInput] = useState("");
  const [preview, setPreview] = useState<any>(null);
  const [previewCategory, setPreviewCategory] = useState<string>("education");
  const [looking, setLooking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Recommendations state
  const [recOpen, setRecOpen] = useState(false);
  const [recLoading, setRecLoading] = useState(false);
  const [recItems, setRecItems] = useState<ChannelRecommendation[]>([]);
  const [recEmpty, setRecEmpty] = useState(false);
  const [recPreview, setRecPreview] = useState<any>(null);
  const [recPreviewCat, setRecPreviewCat] = useState<string>("education");
  const [recPreviewLoading, setRecPreviewLoading] = useState(false);
  const [recImporting, setRecImporting] = useState(false);

  const openRecommend = async (force = false) => {
    setRecOpen(true);
    setRecLoading(true);
    setRecEmpty(false);
    try {
      const res: any = await recommendFn({ data: { lang, force } });
      setRecItems(res.items ?? []);
      setRecEmpty(!!res.empty);
    } catch (e: any) {
      toast.error(e.message ?? "Error");
      setRecOpen(false);
    } finally {
      setRecLoading(false);
    }
  };

  const openRecPreview = async (rec: ChannelRecommendation) => {
    setRecPreviewLoading(true);
    setRecPreview({ __rec: rec });
    setRecPreviewCat(rec.suggested_category);
    try {
      const p = await previewFn({ data: { url: `https://youtube.com/@${rec.channel_handle}` } });
      setRecPreview({ ...p, __rec: rec });
      setRecPreviewCat(rec.suggested_category || p.category);
    } catch (e: any) {
      toast.error(e.message ?? "Error");
      setRecPreview(null);
    } finally {
      setRecPreviewLoading(false);
    }
  };

  const importRecommendation = async () => {
    if (!recPreview?.__rec) return;
    setRecImporting(true);
    try {
      const res = await importFn({
        data: { url: `https://youtube.com/@${recPreview.__rec.channel_handle}`, category: recPreviewCat as any },
      });
      toast.success(t("parent.autoImportDone", { n: res.videosImported }));
      setRecItems((items) => items.filter((x) => x.channel_handle !== recPreview.__rec.channel_handle));
      setRecPreview(null);
      qc.invalidateQueries({ queryKey: ["wl"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setRecImporting(false);
    }
  };

  const openAuto = () => {
    setUrlInput("");
    setPreview(null);
    setPreviewCategory("education");
    setAutoOpen(true);
  };

  const openManual = () => {
    setManualForm({
      input: "",
      youtube_channel_id: "",
      channel_name: "",
      channel_handle: "",
      channel_thumbnail_url: "",
      category: "education",
      active: true,
    });
    setManualOpen(true);
  };

  const lookup = async () => {
    if (!urlInput.trim()) return;
    setLooking(true);
    setPreview(null);
    try {
      const p = await previewFn({ data: { url: urlInput.trim() } });
      setPreview(p);
      setPreviewCategory(p.category);
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setLooking(false);
    }
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await importFn({
        data: { url: urlInput.trim(), category: previewCategory as any },
      });
      toast.success(t("parent.autoImportDone", { n: res.videosImported }));
      setAutoOpen(false);
      qc.invalidateQueries({ queryKey: ["wl"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setImporting(false);
    }
  };

  const doRefresh = async (id: string) => {
    setRefreshingId(id);
    try {
      const res = await refreshFn({ data: { channelId: id } });
      toast.success(t("parent.syncDone", { n: res.videosImported }));
      qc.invalidateQueries({ queryKey: ["wl"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    } finally {
      setRefreshingId(null);
    }
  };

  const parseManual = (raw: string) => {
    const p = parseYouTubeChannel(raw);
    setManualForm((f: any) => ({
      ...f,
      input: raw,
      youtube_channel_id: p.id || p.handle || "",
      channel_handle: p.handle || f.channel_handle,
    }));
  };

  const saveManual = async () => {
    if (!manualForm.youtube_channel_id || !manualForm.channel_name) {
      toast.error("Missing fields");
      return;
    }
    try {
      await upsertFn({
        data: {
          youtube_channel_id: manualForm.youtube_channel_id,
          channel_name: manualForm.channel_name,
          channel_handle: manualForm.channel_handle || null,
          channel_thumbnail_url: manualForm.channel_thumbnail_url || null,
          category: manualForm.category,
          active: manualForm.active,
        },
      });
      toast.success("✔️");
      setManualOpen(false);
      qc.invalidateQueries({ queryKey: ["wl"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleActive = async (c: any) => {
    await upsertFn({ data: { ...c, active: !c.active } });
    qc.invalidateQueries({ queryKey: ["wl"] });
  };

  const remove = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["wl"] });
  };

  return (
    <ParentShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-display font-bold">{t("parent.whitelist")}</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="rounded-full" onClick={() => openRecommend(false)} disabled={channels.length === 0}>
            <Sparkles className="w-4 h-4 mr-1" /> {t("whitelist.recommend")}
          </Button>
          <Button variant="outline" className="rounded-full" onClick={openManual}>
            {t("parent.manualAdd")}
          </Button>
          <Button className="rounded-full" onClick={openAuto}>
            <Plus className="w-4 h-4 mr-1" /> {t("parent.addChannel")}
          </Button>
        </div>
      </div>

      {channels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t("parent.noChannels")}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {channels.map((c: any) => (
            <Card key={c.id}>
              <CardContent className="p-5 flex items-center gap-4">
                {c.channel_thumbnail_url ? (
                  <img src={c.channel_thumbnail_url} alt={c.channel_name} className="w-14 h-14 rounded-full object-cover" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl">📺</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold truncate">{c.channel_name}</div>
                  {c.channel_handle && (
                    <div className="text-xs text-muted-foreground truncate">@{c.channel_handle}</div>
                  )}
                  <Select
                    value={c.category ?? ""}
                    onValueChange={async (v) => {
                      try {
                        await updateCatFn({ data: { channelId: c.id, category: v } });
                        toast.success(t("parent.categoryUpdated"));
                        qc.invalidateQueries({ queryKey: ["wl"] });
                      } catch (e: any) {
                        toast.error(e.message ?? "Error");
                      }
                    }}
                  >
                    <SelectTrigger className="h-7 mt-1 text-xs w-auto min-w-[8rem]">
                      <SelectValue placeholder={t("parent.category")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          {catName(cat.slug)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={refreshingId === c.id}
                  onClick={() => doRefresh(c.id)}
                  title={t("parent.sync")}
                >
                  {refreshingId === c.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
                <Link to="/parent/whitelist/$channelId" params={{ channelId: c.id } as any}>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Auto-import dialog */}
      <Dialog open={autoOpen} onOpenChange={setAutoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("parent.addChannel")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("parent.lookup")}</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder={t("parent.lookupPlaceholder")}
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookup()}
                />
                <Button onClick={lookup} disabled={looking || !urlInput.trim()}>
                  {looking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {preview && (
              <Card>
                <CardContent className="p-4 flex gap-3">
                  {preview.channel_thumbnail_url && (
                    <img src={preview.channel_thumbnail_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-bold truncate">{preview.channel_name}</div>
                    {preview.channel_handle && (
                      <div className="text-xs text-muted-foreground">@{preview.channel_handle}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {preview.subscriberCount.toLocaleString()} {t("parent.subscribers")} · {preview.videoCount} videos
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {preview && (
              <div>
                <Label>{t("parent.autoCategory")}</Label>
                <Select value={previewCategory} onValueChange={setPreviewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {catName(c.slug)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoOpen(false)}>
              {t("profile.cancel")}
            </Button>
            <Button onClick={doImport} disabled={!preview || importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {t("parent.autoImport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual fallback dialog */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("parent.manualAdd")}</DialogTitle>
          </DialogHeader>
          {manualForm && (
            <div className="space-y-3">
              <div>
                <Label>{t("parent.channelUrl")}</Label>
                <Input
                  placeholder="https://youtube.com/@NatGeoKids"
                  value={manualForm.input}
                  onChange={(e) => parseManual(e.target.value)}
                />
                {manualForm.youtube_channel_id && (
                  <div className="text-xs text-muted-foreground mt-1">ID: {manualForm.youtube_channel_id}</div>
                )}
              </div>
              <div>
                <Label>{t("parent.channelName")}</Label>
                <Input
                  value={manualForm.channel_name}
                  onChange={(e) => setManualForm({ ...manualForm, channel_name: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("parent.channelThumb")}</Label>
                <Input
                  placeholder="https://..."
                  value={manualForm.channel_thumbnail_url}
                  onChange={(e) => setManualForm({ ...manualForm, channel_thumbnail_url: e.target.value })}
                />
              </div>
              <div>
                <Label>{t("parent.category")}</Label>
                <Select
                  value={manualForm.category}
                  onValueChange={(v) => setManualForm({ ...manualForm, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {catName(c.slug)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)}>
              {t("profile.cancel")}
            </Button>
            <Button onClick={saveManual}>{t("parent.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ParentShell>
  );
}

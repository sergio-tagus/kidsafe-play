import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/parent/category-select";
import { ChannelPreviewCard } from "@/components/parent/channel-preview-card";
import type { Category, ChannelPreview } from "@/lib/domain-types";
import type { ChannelRecommendation } from "@/lib/recommendations.functions";
import { errorMessage } from "@/hooks/use-whitelist";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  categoryName: (slug: string) => string;
  fetchRecommendations: (force: boolean) => Promise<{ items: ChannelRecommendation[]; empty?: boolean }>;
  lookupChannel: (url: string) => Promise<ChannelPreview>;
  importChannel: (url: string, category: string) => Promise<{ videosImported: number }>;
  onImported: () => void;
};

const handleUrl = (handle: string) => `https://youtube.com/@${handle}`;

export function RecommendationsDialog({
  open,
  onOpenChange,
  categories,
  categoryName,
  fetchRecommendations,
  lookupChannel,
  importChannel,
  onImported,
}: Props) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ChannelRecommendation[]>([]);
  const [empty, setEmpty] = useState(false);

  const [selected, setSelected] = useState<ChannelRecommendation | null>(null);
  const [preview, setPreview] = useState<ChannelPreview | null>(null);
  const [previewCategory, setPreviewCategory] = useState("education");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = async (force: boolean) => {
    setLoading(true);
    setEmpty(false);
    try {
      const res = await fetchRecommendations(force);
      setItems(res.items ?? []);
      setEmpty(!!res.empty);
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) void load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const openPreview = async (rec: ChannelRecommendation) => {
    setSelected(rec);
    setPreview(null);
    setPreviewCategory(rec.suggested_category);
    setPreviewLoading(true);
    try {
      const p = await lookupChannel(handleUrl(rec.channel_handle));
      setPreview(p);
      setPreviewCategory(rec.suggested_category || p.category);
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
      setSelected(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const doImport = async () => {
    if (!selected || !preview) return;
    setImporting(true);
    try {
      const res = await importChannel(handleUrl(selected.channel_handle), previewCategory);
      toast.success(t("parent.autoImportDone", { n: res.videosImported }));
      setItems((list) => list.filter((x) => x.channel_handle !== selected.channel_handle));
      setSelected(null);
      setPreview(null);
      onImported();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" /> {t("whitelist.recommend")}
              </DialogTitle>
              <Button size="sm" variant="ghost" onClick={() => load(true)} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
                {t("whitelist.regenerate")}
              </Button>
            </div>
          </DialogHeader>
          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
              <span className="text-sm">{t("whitelist.recommendLoading")}</span>
            </div>
          ) : empty ? (
            <div className="text-center py-8 text-muted-foreground">{t("whitelist.recommendNeedList")}</div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("whitelist.recommendNone")}</div>
          ) : (
            <div className="space-y-3">
              {items.map((rec) => (
                <Card key={rec.channel_handle + rec.channel_name}>
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold truncate">{rec.channel_name}</div>
                      <div className="text-xs text-muted-foreground">
                        @{rec.channel_handle} · {categoryName(rec.suggested_category)}
                      </div>
                      <div className="text-sm mt-2">{rec.reason}</div>
                    </div>
                    <Button size="sm" onClick={() => openPreview(rec)}>
                      {t("whitelist.recommendPreview")}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) {
            setSelected(null);
            setPreview(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.channel_name}</DialogTitle>
          </DialogHeader>
          {previewLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" aria-hidden="true" />
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <ChannelPreviewCard preview={preview} />
              {selected && <div className="text-sm text-muted-foreground italic">{selected.reason}</div>}
              <div>
                <Label>{t("parent.autoCategory")}</Label>
                <CategorySelect categories={categories} value={previewCategory} onChange={setPreviewCategory} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-4">{t("common.error")}</div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setPreview(null);
              }}
            >
              {t("profile.cancel")}
            </Button>
            <Button onClick={doImport} disabled={!preview || importing}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" aria-hidden="true" /> : null}
              {t("parent.autoImport")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

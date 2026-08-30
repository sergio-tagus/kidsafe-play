import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/parent/category-select";
import { ChannelPreviewCard } from "@/components/parent/channel-preview-card";
import type { Category, ChannelPreview } from "@/lib/domain-types";
import { errorMessage } from "@/hooks/use-whitelist";
import { useI18n } from "@/lib/i18n";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  lookupChannel: (url: string) => Promise<ChannelPreview>;
  importChannel: (url: string, category: string) => Promise<{ videosImported: number }>;
  onImported: () => void;
};

export function AddChannelDialog({
  open,
  onOpenChange,
  categories,
  lookupChannel,
  importChannel,
  onImported,
}: Props) {
  const { t } = useI18n();
  const [urlInput, setUrlInput] = useState("");
  const [preview, setPreview] = useState<ChannelPreview | null>(null);
  const [category, setCategory] = useState("education");
  const [looking, setLooking] = useState(false);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setUrlInput("");
    setPreview(null);
    setCategory("education");
  };

  const lookup = async () => {
    if (!urlInput.trim()) return;
    setLooking(true);
    setPreview(null);
    try {
      const p = await lookupChannel(urlInput.trim());
      setPreview(p);
      setCategory(p.category);
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    } finally {
      setLooking(false);
    }
  };

  const doImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await importChannel(urlInput.trim(), category);
      toast.success(t("parent.autoImportDone", { n: res.videosImported }));
      onOpenChange(false);
      reset();
      onImported();
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("parent.addChannel")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="channel-lookup">{t("parent.lookup")}</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="channel-lookup"
                placeholder={t("parent.lookupPlaceholder")}
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup()}
              />
              <Button onClick={lookup} disabled={looking || !urlInput.trim()} aria-label={t("parent.lookup")}>
                {looking ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Search className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          {preview && <ChannelPreviewCard preview={preview} />}

          {preview && (
            <div>
              <Label>{t("parent.autoCategory")}</Label>
              <CategorySelect categories={categories} value={category} onChange={setCategory} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("profile.cancel")}
          </Button>
          <Button onClick={doImport} disabled={!preview || importing}>
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" aria-hidden="true" /> : null}
            {t("parent.autoImport")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

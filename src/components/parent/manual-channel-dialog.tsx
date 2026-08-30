import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CategorySelect } from "@/components/parent/category-select";
import type { Category } from "@/lib/domain-types";
import { errorMessage } from "@/hooks/use-whitelist";
import { parseYouTubeChannel } from "@/lib/youtube";
import { useI18n } from "@/lib/i18n";

export type ManualChannelInput = {
  youtube_channel_id: string;
  channel_name: string;
  channel_handle: string | null;
  channel_thumbnail_url: string | null;
  category: string;
  active: boolean;
};

const emptyForm = {
  input: "",
  youtube_channel_id: "",
  channel_name: "",
  channel_handle: "",
  channel_thumbnail_url: "",
  category: "education",
  active: true,
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onSave: (channel: ManualChannelInput) => Promise<void>;
};

export function ManualChannelDialog({ open, onOpenChange, categories, onSave }: Props) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(emptyForm);
  }, [open]);

  const parseManual = (raw: string) => {
    const p = parseYouTubeChannel(raw);
    setForm((f) => ({
      ...f,
      input: raw,
      youtube_channel_id: p.id || p.handle || "",
      channel_handle: p.handle || f.channel_handle,
    }));
  };

  const save = async () => {
    if (!form.youtube_channel_id || !form.channel_name) {
      toast.error(t("parent.missingFields"));
      return;
    }
    try {
      await onSave({
        youtube_channel_id: form.youtube_channel_id,
        channel_name: form.channel_name,
        channel_handle: form.channel_handle || null,
        channel_thumbnail_url: form.channel_thumbnail_url || null,
        category: form.category,
        active: form.active,
      });
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(e, t("common.error")));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("parent.manualAdd")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="manual-url">{t("parent.channelUrl")}</Label>
            <Input
              id="manual-url"
              placeholder="https://youtube.com/@NatGeoKids"
              value={form.input}
              onChange={(e) => parseManual(e.target.value)}
            />
            {form.youtube_channel_id && (
              <div className="text-xs text-muted-foreground mt-1">ID: {form.youtube_channel_id}</div>
            )}
          </div>
          <div>
            <Label htmlFor="manual-name">{t("parent.channelName")}</Label>
            <Input
              id="manual-name"
              value={form.channel_name}
              onChange={(e) => setForm({ ...form, channel_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="manual-thumb">{t("parent.channelThumb")}</Label>
            <Input
              id="manual-thumb"
              placeholder="https://..."
              value={form.channel_thumbnail_url}
              onChange={(e) => setForm({ ...form, channel_thumbnail_url: e.target.value })}
            />
          </div>
          <div>
            <Label>{t("parent.category")}</Label>
            <CategorySelect
              categories={categories}
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("profile.cancel")}
          </Button>
          <Button onClick={save}>{t("parent.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

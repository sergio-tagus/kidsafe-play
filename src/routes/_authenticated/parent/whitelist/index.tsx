import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listWhitelistChannels, upsertWhitelistChannel, deleteWhitelistChannel } from "@/lib/parent.functions";
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
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parent/whitelist/")({
  component: WhitelistPage,
});

const CATEGORIES = ["cartoons", "education", "music", "science", "stories", "games", "arts", "sports"] as const;

function WhitelistPage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listWhitelistChannels);
  const upsertFn = useServerFn(upsertWhitelistChannel);
  const delFn = useServerFn(deleteWhitelistChannel);

  const { data: channels = [] } = useQuery({ queryKey: ["wl"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(null);

  const openNew = () => {
    setForm({ input: "", youtube_channel_id: "", channel_name: "", channel_handle: "", channel_thumbnail_url: "", category: "education", active: true });
    setOpen(true);
  };

  const parseInput = (raw: string) => {
    const p = parseYouTubeChannel(raw);
    setForm((f: any) => ({
      ...f,
      input: raw,
      youtube_channel_id: p.id || p.handle || "",
      channel_handle: p.handle || f.channel_handle,
    }));
  };

  const save = async () => {
    if (!form.youtube_channel_id || !form.channel_name) {
      toast.error("Missing fields");
      return;
    }
    try {
      await upsertFn({
        data: {
          id: form.id,
          youtube_channel_id: form.youtube_channel_id,
          channel_name: form.channel_name,
          channel_handle: form.channel_handle || null,
          channel_thumbnail_url: form.channel_thumbnail_url || null,
          category: form.category,
          active: form.active,
        },
      });
      toast.success("✔️");
      setOpen(false);
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">{t("parent.whitelist")}</h1>
        <Button className="rounded-full" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> {t("parent.addChannel")}</Button>
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
                  <div className="text-xs text-muted-foreground truncate">{c.channel_handle ? `@${c.channel_handle} · ` : ""}{t(`categories.${c.category}` as any)}</div>
                </div>
                <Switch checked={c.active} onCheckedChange={() => toggleActive(c)} />
                <Link to="/parent/whitelist/$channelId" params={{ channelId: c.id } as any}>
                  <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("parent.addChannel")}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>{t("parent.channelUrl")}</Label>
                <Input placeholder="https://youtube.com/@NatGeoKids" value={form.input} onChange={(e) => parseInput(e.target.value)} />
                {form.youtube_channel_id && <div className="text-xs text-muted-foreground mt-1">ID: {form.youtube_channel_id}</div>}
              </div>
              <div>
                <Label>{t("parent.channelName")}</Label>
                <Input value={form.channel_name} onChange={(e) => setForm({ ...form, channel_name: e.target.value })} />
              </div>
              <div>
                <Label>{t("parent.channelThumb")}</Label>
                <Input placeholder="https://..." value={form.channel_thumbnail_url} onChange={(e) => setForm({ ...form, channel_thumbnail_url: e.target.value })} />
              </div>
              <div>
                <Label>{t("parent.category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`categories.${c}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("profile.cancel")}</Button>
            <Button onClick={save}>{t("parent.confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ParentShell>
  );
}

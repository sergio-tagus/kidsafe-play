import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listChannelVideos, upsertVideo, deleteVideo, listWhitelistChannels } from "@/lib/parent.functions";
import { ParentShell } from "@/components/parent-shell";
import { useI18n } from "@/lib/i18n";
import { parseYouTubeVideo, youtubeThumb } from "@/lib/youtube";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const LANG_FLAGS: Record<string, string> = {
  es: "🇪🇸", en: "🇬🇧", pt: "🇵🇹", fr: "🇫🇷", de: "🇩🇪", it: "🇮🇹",
  ca: "🏴", gl: "🏴", eu: "🏴", ja: "🇯🇵", ko: "🇰🇷", zh: "🇨🇳", ar: "🇸🇦", ru: "🇷🇺",
  unknown: "🏳️",
};

export const Route = createFileRoute("/_authenticated/parent/whitelist/$channelId")({
  component: ChannelDetail,
});

function ChannelDetail() {
  const { channelId } = Route.useParams();
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listChannelVideos);
  const upsertFn = useServerFn(upsertVideo);
  const delFn = useServerFn(deleteVideo);
  const chsFn = useServerFn(listWhitelistChannels);

  const { data: videos = [] } = useQuery({ queryKey: ["ch-videos", channelId], queryFn: () => listFn({ data: { channelId } }) });
  const { data: chs = [] } = useQuery({ queryKey: ["wl"], queryFn: () => chsFn() });
  const channel = chs.find((c: any) => c.id === channelId);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(null);

  const openNew = () => {
    setForm({ whitelist_channel_id: channelId, videoInput: "", youtube_video_id: "", title: "", description: "", thumbnail_url: "", duration_seconds: "", published_at: "" });
    setOpen(true);
  };

  const parseVid = (raw: string) => {
    const id = parseYouTubeVideo(raw);
    setForm((f: any) => ({
      ...f,
      videoInput: raw,
      youtube_video_id: id ?? "",
      thumbnail_url: f.thumbnail_url || (id ? youtubeThumb(id) : ""),
    }));
  };

  const save = async () => {
    if (!form.youtube_video_id || !form.title) {
      toast.error("Missing fields");
      return;
    }
    try {
      await upsertFn({
        data: {
          whitelist_channel_id: channelId,
          youtube_video_id: form.youtube_video_id,
          title: form.title,
          description: form.description || null,
          thumbnail_url: form.thumbnail_url || null,
          duration_seconds: form.duration_seconds ? Number(form.duration_seconds) : null,
          published_at: form.published_at || null,
        },
      });
      toast.success("✔️");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["ch-videos", channelId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const remove = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["ch-videos", channelId] });
  };

  return (
    <ParentShell>
      <div className="flex items-center gap-3 mb-4">
        <Link to="/parent/whitelist"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <h1 className="text-2xl font-display font-bold flex-1 truncate">{channel?.channel_name ?? ""}</h1>
        <Button className="rounded-full" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> {t("parent.addVideo")}</Button>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t("parent.noVideos")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((v: any) => (
            <Card key={v.id}>
              <CardContent className="p-3">
                <img src={v.thumbnail_url ?? youtubeThumb(v.youtube_video_id)} alt="" className="w-full aspect-video rounded-lg object-cover" />
                <div className="mt-2 font-semibold text-sm line-clamp-2">{v.title}</div>
                <div className="mt-2 flex justify-end">
                  <Button variant="ghost" size="icon" onClick={() => remove(v.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("parent.addVideo")}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-3">
              <div>
                <Label>{t("parent.videoUrl")}</Label>
                <Input placeholder="https://youtube.com/watch?v=..." value={form.videoInput} onChange={(e) => parseVid(e.target.value)} />
                {form.youtube_video_id && <div className="text-xs text-muted-foreground mt-1">ID: {form.youtube_video_id}</div>}
              </div>
              <div>
                <Label>{t("parent.videoTitle")}</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>{t("parent.videoDesc")}</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("parent.duration")}</Label>
                  <Input type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: e.target.value })} />
                </div>
                <div>
                  <Label>{t("parent.videoThumb")}</Label>
                  <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} />
                </div>
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

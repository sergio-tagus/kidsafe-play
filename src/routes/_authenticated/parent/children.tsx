import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listChildProfiles, upsertChildProfile, deleteChildProfile } from "@/lib/parent.functions";
import { ParentShell } from "@/components/parent-shell";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parent/children")({
  component: ParentChildren,
});

const EMOJIS = ["🦁", "🐯", "🐶", "🐱", "🦊", "🐼", "🐵", "🦄", "🐸", "🐰", "🐨", "🦉", "🐧", "🦖", "🐝", "🌈"];

function ParentChildren() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listChildProfiles);
  const upsertFn = useServerFn(upsertChildProfile);
  const delFn = useServerFn(deleteChildProfile);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => listFn() });

  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ profile_name: "", age: null, avatar_emoji: "🦁", daily_screen_time_minutes: 60 });
    setOpen(true);
  };
  const openEdit = (k: any) => {
    setEditing({ ...k });
    setOpen(true);
  };
  const save = async () => {
    try {
      await upsertFn({
        data: {
          id: editing.id,
          profile_name: editing.profile_name,
          age: editing.age ? Number(editing.age) : null,
          avatar_emoji: editing.avatar_emoji,
          daily_screen_time_minutes: Number(editing.daily_screen_time_minutes),
        },
      });
      toast.success("✔️");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["kids"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const remove = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await delFn({ data: { id } });
    qc.invalidateQueries({ queryKey: ["kids"] });
  };

  return (
    <ParentShell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-display font-bold">{t("parent.children")}</h1>
        <Button className="rounded-full" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> {t("profile.add")}</Button>
      </div>
      {kids.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">{t("parent.noKids")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kids.map((k: any) => (
            <Card key={k.id}>
              <CardContent className="p-5 flex items-center gap-4">
                <div className="text-5xl">{k.avatar_emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-lg">{k.profile_name}</div>
                  <div className="text-sm text-muted-foreground">{k.age ? `${k.age} yr · ` : ""}{k.daily_screen_time_minutes} {t("parent.min")}/day</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(k)}><Pencil className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => remove(k.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("profile.new") : t("profile.new")}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>{t("profile.avatar")}</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEditing({ ...editing, avatar_emoji: e })}
                      className={`text-3xl w-12 h-12 rounded-xl flex items-center justify-center transition-all ${editing.avatar_emoji === e ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>{t("profile.name")}</Label>
                <Input value={editing.profile_name} onChange={(e) => setEditing({ ...editing, profile_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("profile.age")}</Label>
                  <Input type="number" value={editing.age ?? ""} onChange={(e) => setEditing({ ...editing, age: e.target.value })} />
                </div>
                <div>
                  <Label>{t("profile.screenTime")}</Label>
                  <Select value={String(editing.daily_screen_time_minutes)} onValueChange={(v) => setEditing({ ...editing, daily_screen_time_minutes: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[15, 30, 45, 60, 90, 120, 180, 240, 300].map((m) => <SelectItem key={m} value={String(m)}>{m} min</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("profile.cancel")}</Button>
            <Button onClick={save}>{t("profile.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ParentShell>
  );
}

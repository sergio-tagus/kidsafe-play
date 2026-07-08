import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import * as Icons from "lucide-react";
import { listCategoriesWithCounts, upsertCategory, deleteCategory } from "@/lib/categories.functions";
import { ParentShell } from "@/components/parent-shell";
import { useI18n } from "@/lib/i18n";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/parent/categories")({
  component: CategoriesPage,
});

type CatRow = {
  id: string;
  slug: string;
  name_es: string;
  name_en: string;
  name_pt: string;
  icon: string;
  color: string | null;
  sort_order: number;
  is_default: boolean;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function CatIcon({ name, className }: { name: string; className?: string }) {
  const Comp = (Icons as any)[name] ?? Icons.Sparkles;
  return <Comp className={className} />;
}

function CategoriesPage() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const listFn = useServerFn(listCategories);
  const upsertFn = useServerFn(upsertCategory);
  const delFn = useServerFn(deleteCategory);

  const { data: cats = [] } = useQuery<CatRow[]>({ queryKey: ["categories"], queryFn: () => listFn() as any });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<CatRow> & { slugTouched?: boolean } | null>(null);

  const openNew = () => {
    setForm({
      slug: "",
      name_es: "",
      name_en: "",
      name_pt: "",
      icon: "Sparkles",
      color: "#60A5FA",
      sort_order: 100,
      is_default: false,
      slugTouched: false,
    });
    setOpen(true);
  };

  const openEdit = (c: CatRow) => {
    setForm({ ...c, slugTouched: true });
    setOpen(true);
  };

  const save = async () => {
    if (!form) return;
    const slug = form.slug?.trim() || slugify(form.name_en || form.name_es || "");
    if (!slug || !form.name_es || !form.name_en || !form.name_pt) {
      toast.error(t("common.error"));
      return;
    }
    try {
      await upsertFn({
        data: {
          id: form.id,
          slug,
          name_es: form.name_es!,
          name_en: form.name_en!,
          name_pt: form.name_pt!,
          icon: form.icon || "Sparkles",
          color: form.color || null,
          sort_order: Number(form.sort_order ?? 100),
        },
      });
      toast.success("✔️");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["categories"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  const remove = async (c: CatRow) => {
    if (c.is_default) return;
    if (!confirm(t("common.confirmDelete"))) return;
    try {
      await delFn({ data: { id: c.id } });
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: ["wl"] });
    } catch (e: any) {
      toast.error(e.message ?? "Error");
    }
  };

  const nameFor = (c: CatRow) => (lang === "es" ? c.name_es : lang === "pt" ? c.name_pt : c.name_en);

  return (
    <ParentShell>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-display font-bold">{t("categories.title")}</h1>
        <Button className="rounded-full" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1" /> {t("parent.categoryNew")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cats.map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ background: c.color ?? "hsl(var(--primary))" }}
              >
                <CatIcon name={c.icon} className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display font-bold truncate flex items-center gap-1.5">
                  {nameFor(c)}
                  {c.is_default && <Lock className="w-3 h-3 text-muted-foreground" />}
                </div>
                <div className="text-xs text-muted-foreground truncate">{c.slug}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={c.is_default}
                onClick={() => remove(c)}
                title={c.is_default ? t("parent.categoryLocked") : ""}
              >
                <Trash2 className={`w-4 h-4 ${c.is_default ? "opacity-30" : "text-destructive"}`} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? t("parent.categoryEdit") : t("parent.categoryNew")}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <Label>{t("parent.categoryIcon")}</Label>
                  <Input
                    value={form.icon ?? ""}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="Sparkles"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: form.color || "hsl(var(--primary))" }}
                    >
                      <CatIcon name={form.icon || "Sparkles"} className="w-5 h-5" />
                    </div>
                    <Input
                      type="color"
                      value={form.color ?? "#60A5FA"}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-14 h-10 p-1"
                    />
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">lucide.dev/icons</div>
                </div>
                <div className="col-span-2 space-y-3">
                  <div>
                    <Label>{t("parent.categoryNameEs")}</Label>
                    <Input
                      value={form.name_es ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name_es: e.target.value,
                          slug: form.slugTouched ? form.slug : slugify(form.name_en || e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("parent.categoryNameEn")}</Label>
                    <Input
                      value={form.name_en ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name_en: e.target.value,
                          slug: form.slugTouched ? form.slug : slugify(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>{t("parent.categoryNamePt")}</Label>
                    <Input
                      value={form.name_pt ?? ""}
                      onChange={(e) => setForm({ ...form, name_pt: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <Label>{t("parent.categorySlug")}</Label>
                <Input
                  value={form.slug ?? ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
                  placeholder="my-category"
                  disabled={form.is_default}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {form.is_default ? t("parent.categoryLocked") : t("parent.categorySlugHint")}
                </div>
              </div>
              <div>
                <Label>{t("parent.categoryOrder")}</Label>
                <Input
                  type="number"
                  value={form.sort_order ?? 100}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("profile.cancel")}
            </Button>
            <Button onClick={save}>{t("profile.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ParentShell>
  );
}

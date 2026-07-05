import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import * as Icons from "lucide-react";
import { listChildProfiles } from "@/lib/parent.functions";
import { listCategoriesWithContent } from "@/lib/categories.functions";
import { KidShell } from "@/components/kid-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kids/$childId/categories/")({
  component: CategoriesPage,
});

function CatIcon({ name, className }: { name: string; className?: string }) {
  const Comp = (Icons as any)[name] ?? Icons.Sparkles;
  return <Comp className={className} />;
}

function CategoriesPage() {
  const { childId } = Route.useParams();
  const { t, lang } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const catsFn = useServerFn(listCategoriesWithContent);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const { data: cats = [] } = useQuery<any[]>({ queryKey: ["categories", "with-content"], queryFn: () => catsFn() as any });
  const child = kids.find((k: any) => k.id === childId) ?? null;

  const nameFor = (c: any) => (lang === "es" ? c.name_es : lang === "pt" ? c.name_pt : c.name_en);

  return (
    <KidShell childId={childId} child={child}>
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-6">{t("categories.title")}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {cats.map((c: any) => (
          <Link
            key={c.slug}
            to="/kids/$childId/categories/$category"
            params={{ childId, category: c.slug } as any}
            className="rounded-3xl p-6 text-center text-white shadow-lg hover:-translate-y-1 transition-transform"
            style={{ background: c.color ?? "hsl(var(--primary))" }}
          >
            <div className="flex justify-center mb-3">
              <CatIcon name={c.icon} className="w-12 h-12" />
            </div>
            <div className="font-display font-bold text-lg">{nameFor(c)}</div>
          </Link>
        ))}
      </div>
    </KidShell>
  );
}

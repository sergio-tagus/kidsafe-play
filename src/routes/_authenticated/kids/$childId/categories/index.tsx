import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listChildProfiles } from "@/lib/parent.functions";
import { KidShell } from "@/components/kid-shell";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/kids/$childId/categories/")({
  component: CategoriesPage,
});

const CATS = [
  { key: "cartoons", emoji: "🎨", color: "gradient-fun" },
  { key: "education", emoji: "📚", color: "gradient-cool" },
  { key: "music", emoji: "🎵", color: "gradient-warm" },
  { key: "science", emoji: "🔬", color: "gradient-cool" },
  { key: "stories", emoji: "📖", color: "gradient-fun" },
  { key: "games", emoji: "🎮", color: "gradient-warm" },
  { key: "arts", emoji: "🖌️", color: "gradient-fun" },
  { key: "sports", emoji: "⚽", color: "gradient-cool" },
] as const;

function CategoriesPage() {
  const { childId } = Route.useParams();
  const { t } = useI18n();
  const kidsFn = useServerFn(listChildProfiles);
  const { data: kids = [] } = useQuery({ queryKey: ["kids"], queryFn: () => kidsFn() });
  const child = kids.find((k: any) => k.id === childId) ?? null;

  return (
    <KidShell childId={childId} child={child}>
      <h1 className="text-2xl md:text-3xl font-display font-bold mb-6">{t("categories.title")}</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {CATS.map((c) => (
          <Link
            key={c.key}
            to="/kids/$childId/categories/$category"
            params={{ childId, category: c.key } as any}
            className={`${c.color} rounded-3xl p-6 text-center text-white shadow-lg hover:-translate-y-1 transition-transform`}
          >
            <div className="text-5xl mb-2">{c.emoji}</div>
            <div className="font-display font-bold text-lg">{t(`categories.${c.key}`)}</div>
          </Link>
        ))}
      </div>
    </KidShell>
  );
}

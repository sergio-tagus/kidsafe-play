import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { categoryName, type Category } from "@/lib/domain-types";
import { useI18n } from "@/lib/i18n";

type Props = {
  categories: Category[];
  value: string;
  onChange: (slug: string) => void;
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
};

export function CategorySelect({ categories, value, onChange, className, placeholder, ariaLabel }: Props) {
  const { lang, t } = useI18n();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={ariaLabel ?? t("parent.category")}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c.slug} value={c.slug}>
            {categoryName(c, lang)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

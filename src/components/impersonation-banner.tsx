import { useImpersonation } from "@/lib/impersonation";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { UserCheck, LogOut } from "lucide-react";

export function ImpersonationBanner() {
  const { impersonation, stop } = useImpersonation();
  const { t } = useI18n();
  if (!impersonation) return null;
  const name = impersonation.target.name || impersonation.target.email || impersonation.target.id;
  return (
    <div className="sticky top-0 z-[60] w-full bg-destructive text-destructive-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-2 text-sm font-semibold">
        <UserCheck className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          {t("imp.bannerPrefix")} {name}
          {impersonation.target.email ? ` (${impersonation.target.email})` : ""}
        </span>
        <Button
          size="sm"
          variant="secondary"
          className="rounded-full"
          onClick={() => void stop()}
        >
          <LogOut className="mr-1 h-4 w-4" /> {t("imp.end")}
        </Button>
      </div>
    </div>
  );
}

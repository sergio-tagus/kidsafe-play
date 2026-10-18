import { useState } from "react";
import { useI18n, LANGS } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { isTvMode } from "@/lib/tv-mode";

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang);
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-full text-white hover:bg-white/10"
          onKeyDown={(e) => {
            if (!isTvMode()) return;
            // TV: arrows only move focus; the menu opens with OK.
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              (e.nativeEvent as any).__tvSkipPrevent = true;
            }
          }}
          onKeyDownCapture={(e) => {
            if (!isTvMode()) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              // Stop Radix from opening, but let the global D-pad navigator move focus.
              e.stopPropagation();
            }
          }}
        >
          <Globe className="w-4 h-4 mr-1" /> {current?.flag}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => setLang(l.code)}>
            <span className="mr-2">{l.flag}</span> {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

import type { Database } from "@/integrations/supabase/types";
import type { Lang } from "@/lib/i18n/types";

export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type CategoryWithCount = Category & { channel_count: number };
export type WhitelistChannel = Database["public"]["Tables"]["whitelist_channels"]["Row"];
export type ChildProfile = Database["public"]["Tables"]["child_profiles"]["Row"];

/** Result of looking a channel up on YouTube before approving it. */
export type ChannelPreview = {
  youtube_channel_id: string;
  channel_name: string;
  channel_handle: string | null;
  channel_thumbnail_url: string | null;
  subscriberCount: number;
  videoCount: number;
  category: string;
};

export function categoryName(category: Pick<Category, "name_es" | "name_en" | "name_pt">, lang: Lang): string {
  return lang === "es" ? category.name_es : lang === "pt" ? category.name_pt : category.name_en;
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";

import {
  listWhitelistChannels,
  upsertWhitelistChannel,
  deleteWhitelistChannel,
  previewChannelFromUrl,
  importChannelFromUrl,
  refreshChannelVideos,
  updateChannelCategory,
} from "@/lib/parent.functions";
import { listCategories } from "@/lib/categories.functions";
import { qk, kidCatalogScopes } from "@/lib/query-keys";
import { categoryName, type Category } from "@/lib/domain-types";
import { useI18n } from "@/lib/i18n";

/** Invalidates the whitelist plus everything derived from it (kid catalogue). */
export function useInvalidateCatalog() {
  const qc = useQueryClient();
  return useCallback(() => {
    qc.invalidateQueries({ queryKey: qk.whitelist() });
    for (const scope of kidCatalogScopes) qc.invalidateQueries({ queryKey: scope });
  }, [qc]);
}

export function useCategories() {
  const catsFn = useServerFn(listCategories);
  const { lang } = useI18n();
  const query = useQuery<Category[]>({ queryKey: qk.categories(), queryFn: () => catsFn() as Promise<Category[]> });
  const categories = query.data ?? [];
  const nameOf = useCallback(
    (slug: string) => {
      const c = categories.find((x) => x.slug === slug);
      return c ? categoryName(c, lang) : slug;
    },
    [categories, lang],
  );
  return { categories, nameOf, isLoading: query.isLoading };
}

export function useWhitelist() {
  const listFn = useServerFn(listWhitelistChannels);
  const invalidate = useInvalidateCatalog();

  const query = useQuery({ queryKey: qk.whitelist(), queryFn: () => listFn() });

  return {
    channels: query.data ?? [],
    isLoading: query.isLoading,
    invalidate,
    upsert: useServerFn(upsertWhitelistChannel),
    remove: useServerFn(deleteWhitelistChannel),
    preview: useServerFn(previewChannelFromUrl),
    importChannel: useServerFn(importChannelFromUrl),
    refresh: useServerFn(refreshChannelVideos),
    updateCategory: useServerFn(updateChannelCategory),
  };
}

/** Normalises whatever a server function throws into a user-facing message. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string" && e) return e;
  return fallback;
}

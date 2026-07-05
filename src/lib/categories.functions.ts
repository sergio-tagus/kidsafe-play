import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentUnlocked } from "@/lib/parent-unlock";

const slugRegex = /^[a-z0-9][a-z0-9-]{1,40}$/;

export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name_en", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listCategoriesWithContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: wl, error: wlErr } = await context.supabase
      .from("whitelist_channels")
      .select("category")
      .eq("active", true);
    if (wlErr) throw new Error(wlErr.message);
    const slugs = Array.from(new Set((wl ?? []).map((r: any) => r.category).filter(Boolean)));
    if (slugs.length === 0) return [];
    const { data, error } = await context.supabase
      .from("categories")
      .select("*")
      .in("slug", slugs)
      .order("sort_order", { ascending: true })
      .order("name_en", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const upsertInput = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(slugRegex, "slug must be lowercase letters, digits or dashes"),
  name_es: z.string().min(1).max(60),
  name_en: z.string().min(1).max(60),
  name_pt: z.string().min(1).max(60),
  icon: z.string().min(1).max(60).default("Sparkles"),
  color: z.string().max(30).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(100),
});

export const upsertCategory = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => upsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = {
      slug: data.slug,
      name_es: data.name_es,
      name_en: data.name_en,
      name_pt: data.name_pt,
      icon: data.icon,
      color: data.color || null,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await context.supabase.from("categories").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("categories")
      .insert({ ...payload, is_default: false, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireParentUnlocked } from "@/lib/parent-unlock";
import { normalizeEmail, validateLinkEmail } from "@/lib/linked-accounts.rules";

export const listLinkedAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("linked_accounts")
      .select("id, email, linked_user_id, created_at, last_used_at")
      .eq("primary_user_id", context.userId)
      .order("created_at");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const addLinkedAccount = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ email: z.string().max(254) }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const email = normalizeEmail(data.email);
    const { data: rows } = await ctx.supabase
      .from("linked_accounts").select("email").eq("primary_user_id", ctx.userId);
    const ownEmail = (ctx.claims?.email as string | undefined) ?? null;
    const err = validateLinkEmail(email, ownEmail, (rows ?? []).map((r: any) => r.email));
    if (err) throw new Error(err);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: taken } = await supabaseAdmin.from("linked_accounts").select("id").eq("email", email).maybeSingle();
    if (taken) throw new Error("taken");
    // Refuse emails of accounts that already own data, to avoid hiding it.
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (prof) {
      const [{ count: kids }, { count: chans }] = await Promise.all([
        supabaseAdmin.from("child_profiles").select("id", { count: "exact", head: true }).eq("parent_user_id", prof.id),
        supabaseAdmin.from("whitelist_channels").select("id", { count: "exact", head: true }).eq("parent_user_id", prof.id),
      ]);
      if ((kids ?? 0) > 0 || (chans ?? 0) > 0) throw new Error("hasData");
    }
    const { error } = await ctx.supabase.from("linked_accounts").insert({ primary_user_id: ctx.userId, email });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeLinkedAccount = createServerFn({ method: "POST" })
  .middleware([requireParentUnlocked])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as any;
    const { error } = await ctx.supabase.from("linked_accounts").delete().eq("id", data.id).eq("primary_user_id", ctx.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** If the signed-in email is linked to a primary account, mint a login for it. */
export const resolveLinkedLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) return { tokenHash: null as string | null, email: null as string | null };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin
      .from("linked_accounts").select("id, primary_user_id").eq("email", normalizeEmail(email)).maybeSingle();
    if (!link || link.primary_user_id === context.userId) return { tokenHash: null, email: null };
    const { data: primary, error: uErr } = await supabaseAdmin.auth.admin.getUserById(link.primary_user_id);
    if (uErr || !primary?.user?.email) return { tokenHash: null, email: null };
    const { data: gen, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: primary.user.email });
    if (error || !gen?.properties?.hashed_token) return { tokenHash: null, email: null };
    await supabaseAdmin.from("linked_accounts")
      .update({ linked_user_id: context.userId, last_used_at: new Date().toISOString() }).eq("id", link.id);
    return { tokenHash: gen.properties.hashed_token, email };
  });

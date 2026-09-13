import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/require-superadmin";

export type FoundUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
};

/** Search platform users by name or email (superadmin only). */
export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((d: unknown) => z.object({ term: z.string().max(120).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase.rpc("search_users", { term: data.term.trim() });
    if (error) throw new Error(error.message);
    return { users: (rows ?? []) as FoundUser[] };
  });

/**
 * Mint a one-time login token for the target user so the superadmin can
 * experience the app exactly as they do. Returns only the token hash.
 */
export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("Cannot impersonate yourself");

    const { data: profile, error: pErr } = await context.supabase
      .from("profiles")
      .select("id, email, name, avatar_url")
      .eq("id", data.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!profile?.email) throw new Error("User has no email on the platform");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error: lErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    if (lErr) throw new Error(lErr.message);
    const tokenHash = link?.properties?.hashed_token;
    if (!tokenHash) throw new Error("Could not create impersonation session");

    const { data: log, error: logErr } = await context.supabase
      .from("impersonation_logs")
      .insert({ actor_user_id: context.userId, target_user_id: data.userId })
      .select("id")
      .single();
    if (logErr) throw new Error(logErr.message);

    return {
      tokenHash,
      logId: (log as { id: string }).id,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.name ?? null,
        avatar_url: profile.avatar_url ?? null,
      } satisfies FoundUser,
    };
  });

/** Close the audit entry when the superadmin returns to their own session. */
export const endImpersonation = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((d: unknown) => z.object({ logId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("impersonation_logs")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", data.logId)
      .eq("actor_user_id", context.userId);
    return { ok: true };
  });

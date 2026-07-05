import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server-side parent-PIN gate. Chain AFTER requireSupabaseAuth.
 *
 * Rule:
 *  - If the user has never set a PIN, allow (initial setup / no gate configured).
 *  - Otherwise, require parent_pins.unlocked_until > now().
 *
 * unlocked_until is refreshed by verifyPin/setPin (see pin.functions.ts).
 */
export const requireParentUnlocked = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase
      .from("parent_pins")
      .select("unlocked_until")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (data) {
      const until = data.unlocked_until ? new Date(data.unlocked_until as string).getTime() : 0;
      if (!until || until <= Date.now()) {
        throw new Error("Parent zone locked: PIN verification required");
      }
    }
    return next({ context });
  });

export const PARENT_UNLOCK_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Whether the parent still needs to create a PIN and/or add channels (drives the TV welcome screen). */
export const getTvSetupStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [pin, channels] = await Promise.all([
      context.supabase.from("parent_pins").select("user_id").eq("user_id", context.userId).maybeSingle(),
      context.supabase.from("whitelist_channels").select("id", { count: "exact", head: true }),
    ]);
    if (pin.error) throw new Error(pin.error.message);
    if (channels.error) throw new Error(channels.error.message);
    const hasPin = !!pin.data;
    const channelCount = channels.count ?? 0;
    return { hasPin, channelCount, needsSetup: !hasPin && channelCount === 0 };
  });

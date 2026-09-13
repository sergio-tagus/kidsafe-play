import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OnboardingStatus = "pending" | "in_progress" | "skipped" | "done" | "dismissed";

export type OnboardingState = {
  status: OnboardingStatus;
  step: number;
  completedAt: string | null;
  checklist: { children: boolean; channels: boolean; categories: boolean; pin: boolean };
};

export const getOnboardingState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OnboardingState> => {
    const [profileRes, kidsRes, chRes, pinRes] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("onboarding_status, onboarding_step, onboarding_completed_at")
        .eq("id", context.userId)
        .maybeSingle(),
      context.supabase.from("child_profiles").select("id").eq("parent_user_id", context.userId).limit(1),
      context.supabase
        .from("whitelist_channels")
        .select("id, category")
        .eq("parent_user_id", context.userId)
        .limit(50),
      context.supabase.from("parent_pins").select("user_id").eq("user_id", context.userId).maybeSingle(),
    ]);

    const p: any = profileRes.data ?? {};
    const channels = chRes.data ?? [];
    return {
      status: (p.onboarding_status as OnboardingStatus) ?? "pending",
      step: typeof p.onboarding_step === "number" ? p.onboarding_step : 0,
      completedAt: p.onboarding_completed_at ?? null,
      checklist: {
        children: (kidsRes.data ?? []).length > 0,
        channels: channels.length > 0,
        categories: channels.some((c: any) => !!c.category),
        pin: !!pinRes.data,
      },
    };
  });

const setSchema = z.object({
  step: z.number().int().min(0).max(50),
  status: z.enum(["pending", "in_progress", "skipped", "done", "dismissed"]).optional(),
});

export const setOnboardingStep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => setSchema.parse(d))
  .handler(async ({ context, data }) => {
    const status = data.status ?? "in_progress";
    const { error } = await context.supabase
      .from("profiles")
      .update({
        onboarding_status: status,
        onboarding_step: data.step,
        onboarding_completed_at: status === "done" ? new Date().toISOString() : null,
      } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const skipOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ step: z.number().int().min(0).max(50) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ onboarding_status: "skipped", onboarding_step: data.step } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Hide the tour permanently; it stays available from the help menu. */
export const dismissOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ step: z.number().int().min(0).max(50) }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ onboarding_status: "dismissed", onboarding_step: data.step } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ onboarding_status: "in_progress", onboarding_step: 0, onboarding_completed_at: null } as any)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

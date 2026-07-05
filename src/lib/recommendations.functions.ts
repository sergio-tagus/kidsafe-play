import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ChannelRecommendation = {
  channel_name: string;
  channel_handle: string;
  reason: string;
  suggested_category: string;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function callGemini(prompt: string): Promise<ChannelRecommendation[]> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content:
            "You recommend kid-safe YouTube channels. Respond ONLY with a JSON array of 8 objects, no prose, no markdown fences. Each object: { \"channel_name\": string, \"channel_handle\": string (without @, must be a real YouTube handle), \"reason\": string (1-2 short sentences, in the requested language), \"suggested_category\": string (one of the given category slugs) }.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`AI error ${res.status}: ${body.slice(0, 200)}`);
  }
  const j = await res.json();
  const text: string = j.choices?.[0]?.message?.content ?? "";
  // The model may return either an array directly or an object wrapping it.
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    const m = text.match(/\[[\s\S]*\]/);
    if (!m) throw new Error("AI returned invalid JSON");
    parsed = JSON.parse(m[0]);
  }
  const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.channels) ? parsed.channels : Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
  return arr
    .filter((x: any) => x && typeof x.channel_name === "string" && typeof x.channel_handle === "string")
    .map((x: any) => ({
      channel_name: String(x.channel_name),
      channel_handle: String(x.channel_handle).replace(/^@/, ""),
      reason: String(x.reason ?? ""),
      suggested_category: String(x.suggested_category ?? "education"),
    }));
}

export const recommendChannels = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ lang: z.enum(["es", "en", "pt"]).default("es"), force: z.boolean().default(false) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    // Cache
    if (!data.force) {
      const { data: cache } = await context.supabase
        .from("channel_recommendations_cache")
        .select("payload, generated_at")
        .eq("user_id", context.userId)
        .maybeSingle();
      if (cache?.generated_at && Date.now() - new Date(cache.generated_at).getTime() < CACHE_TTL_MS) {
        return { items: cache.payload as ChannelRecommendation[], cached: true };
      }
    }

    // Gather context
    const [{ data: channels }, { data: kids }, { data: cats }] = await Promise.all([
      context.supabase
        .from("whitelist_channels")
        .select("channel_name, channel_handle, category")
        .eq("active", true),
      context.supabase.from("child_profiles").select("age"),
      context.supabase.from("categories").select("slug"),
    ]);

    if (!channels || channels.length === 0) {
      return { items: [] as ChannelRecommendation[], cached: false, empty: true as const };
    }

    const ages = (kids ?? []).map((k) => k.age).filter((a): a is number => typeof a === "number");
    const ageStr = ages.length ? `Kids ages: ${ages.join(", ")}.` : "";
    const catSlugs = (cats ?? []).map((c) => c.slug);
    const langName = data.lang === "es" ? "Spanish" : data.lang === "pt" ? "Portuguese" : "English";

    const listStr = channels
      .map((c) => `- ${c.channel_name}${c.channel_handle ? ` (@${c.channel_handle})` : ""} [${c.category ?? "?"}]`)
      .join("\n");

    const prompt = `${ageStr}

Approved YouTube channels the parent already trusts:
${listStr}

Available category slugs: ${catSlugs.join(", ")}.

Suggest 8 NEW kid-safe YouTube channels similar in tone, age-appropriate, that are NOT in the list above. Write the "reason" field in ${langName}. Return ONLY the JSON array.`;

    const items = await callGemini(prompt);

    // Filter out ones already in the whitelist
    const existing = new Set(
      channels.flatMap((c) => [c.channel_name?.toLowerCase(), c.channel_handle?.toLowerCase()]).filter(Boolean),
    );
    const filtered = items.filter(
      (x) => !existing.has(x.channel_name.toLowerCase()) && !existing.has(x.channel_handle.toLowerCase()),
    );

    await context.supabase
      .from("channel_recommendations_cache")
      .upsert(
        { user_id: context.userId, payload: filtered as any, generated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );

    return { items: filtered, cached: false };
  });

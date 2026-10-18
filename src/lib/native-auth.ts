/**
 * Native (Capacitor) deep-link handler for com.safetube.kids://auth/callback.
 * Reads tokens from the hash/query and restores the session in the WebView.
 * Call from useEffect only.
 */
export function initNativeAuth() {
  if (typeof window === "undefined") return;
  void (async () => {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;
    const { App } = await import("@capacitor/app");
    const { supabase } = await import("@/integrations/supabase/client");
    App.addListener("appUrlOpen", async ({ url }) => {
      if (!url.startsWith("com.safetube.kids://auth/callback")) return;
      const u = new URL(url.replace("com.safetube.kids://", "https://x/"));
      const params = new URLSearchParams(u.hash.replace(/^#/, ""));
      u.searchParams.forEach((v, k) => params.set(k, v));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      const code = params.get("code");
      try {
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        } else if (code) {
          await supabase.auth.exchangeCodeForSession(code);
        } else return;
        window.location.replace("/");
      } catch (e) {
        console.error("Native auth callback failed", e);
      }
    });
  })();
}

/** True only for the Lovable editor preview and local dev — never the published sites. */
export function isLovableHost(hostname: string | null | undefined): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase().split(":")[0];
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h.endsWith(".lovableproject.com") ||
    (h.startsWith("id-preview--") && h.endsWith(".lovable.app"))
  );
}

export function isLovableClient(): boolean {
  return typeof window !== "undefined" && isLovableHost(window.location.hostname);
}

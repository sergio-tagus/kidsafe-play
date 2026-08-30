/**
 * Strips every outbound pointer from a YouTube description so a child can
 * never be nudged towards content outside the whitelist.
 */
export function sanitizeDescription(text: string): string {
  if (!text) return "";
  return (
    text
      // strip full URLs
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/www\.\S+/gi, "")
      // strip bare youtube/social domains
      .replace(
        /\b(?:youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com)\S*/gi,
        "",
      )
      // strip @handles
      .replace(/(^|\s)@[\w.\-]+/g, "$1")
      // strip common "subscribe" lines
      .replace(/^.*(?:suscr[íi]bete|subscribe|sígueme|follow me|redes sociales|social media).*$/gim, "")
      // collapse whitespace
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

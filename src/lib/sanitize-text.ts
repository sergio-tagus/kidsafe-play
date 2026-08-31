// Removes links, social handles and subscribe CTAs so kid-facing text
// never contains an exit route to YouTube or social networks.
export function sanitizeDescription(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(
      /\b(?:youtube\.com|youtu\.be|youtube-nocookie\.com|m\.youtube\.com|instagram\.com|tiktok\.com|facebook\.com|twitter\.com|x\.com)\S*/gi,
      "",
    )
    .replace(/(^|\s)@[\w.\-]+/g, "$1")
    .replace(/^.*(?:suscr[íi]bete|subscribe|sígueme|follow me|redes sociales|social media).*$/gim, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

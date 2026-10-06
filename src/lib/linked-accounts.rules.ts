export const MAX_LINKED_ACCOUNTS = 3;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Returns an error code, or null when the email may be linked. */
export function validateLinkEmail(
  email: string,
  ownEmail: string | null,
  existing: string[],
): null | "invalid" | "own" | "duplicate" | "limit" {
  const e = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "invalid";
  if (ownEmail && normalizeEmail(ownEmail) === e) return "own";
  if (existing.map(normalizeEmail).includes(e)) return "duplicate";
  if (existing.length >= MAX_LINKED_ACCOUNTS) return "limit";
  return null;
}

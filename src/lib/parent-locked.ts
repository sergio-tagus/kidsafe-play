import { toast } from "sonner";

const PIN_KEY = "safetube.parent_pin_ok";

export function isParentLockedError(e: unknown): boolean {
  const msg = (e as any)?.message ?? String(e ?? "");
  return /Parent zone locked/i.test(msg);
}

/** Shows the error; if the server says the parent zone is locked, sends the parent to the PIN screen. */
export function handleParentActionError(e: unknown) {
  if (isParentLockedError(e)) {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(PIN_KEY);
      const next = window.location.pathname;
      window.location.assign(`/parent/unlock?next=${encodeURIComponent(next)}`);
    }
    return;
  }
  toast.error((e as any)?.message ?? "Error");
}

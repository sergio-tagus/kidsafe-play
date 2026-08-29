/** Remembers the last kid profile so the app opens straight into it. */

const CHILD_KEY = "safetube.childId";
const AUTO_KEY = "safetube.autoResume";

export function getLastChildId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CHILD_KEY);
}

export function getAutoResume(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_KEY) !== "0"; // on by default
}

export function setAutoResume(enabled: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_KEY, enabled ? "1" : "0");
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

const PIN_KEY = "safetube.parent_pin_ok";

export function markParentUnlocked() {
  if (typeof window !== "undefined") sessionStorage.setItem(PIN_KEY, "1");
}
export function clearParentUnlock() {
  if (typeof window !== "undefined") sessionStorage.removeItem(PIN_KEY);
}

export const Route = createFileRoute("/_authenticated/parent")({
  beforeLoad: ({ location }) => {
    if (typeof window === "undefined") return;
    if (location.pathname === "/parent/unlock") return;
    if (sessionStorage.getItem(PIN_KEY) === "1") return;
    throw redirect({ to: "/parent/unlock", search: { next: location.pathname } as any });
  },
  component: () => <Outlet />,
});

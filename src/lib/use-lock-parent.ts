import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lockParent } from "@/lib/pin.functions";
import { clearParentUnlock } from "@/routes/_authenticated/parent/route";

/** Entering the kids area always re-locks the parent zone (Back must ask for the PIN again). */
export function useLockParentZone() {
  const lock = useServerFn(lockParent);
  useEffect(() => {
    clearParentUnlock();
    void lock().catch(() => {});
  }, [lock]);
}

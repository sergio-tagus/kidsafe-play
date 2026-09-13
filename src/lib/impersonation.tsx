import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { endImpersonation } from "@/lib/impersonation.functions";

const KEY = "safetube.impersonation";

export type ImpersonationState = {
  logId: string;
  target: { id: string; email: string | null; name: string | null };
  original: { access_token: string; refresh_token: string };
};

function read(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImpersonationState) : null;
  } catch {
    return null;
  }
}

export function saveImpersonation(state: ImpersonationState) {
  localStorage.setItem(KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("safetube:impersonation"));
}

export function clearImpersonation() {
  localStorage.removeItem(KEY);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("safetube:impersonation"));
}

export function isImpersonating(): boolean {
  return read() !== null;
}

type Ctx = {
  impersonation: ImpersonationState | null;
  stop: () => Promise<void>;
};

const ImpersonationCtx = createContext<Ctx | null>(null);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(null);

  useEffect(() => {
    const sync = () => setImpersonation(read());
    sync();
    window.addEventListener("safetube:impersonation", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("safetube:impersonation", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const stop = async () => {
    const state = read();
    clearImpersonation();
    if (!state) return;
    await supabase.auth.setSession(state.original);
    try {
      await endImpersonation({ data: { logId: state.logId } });
    } catch {
      // audit close is best-effort
    }
    window.location.href = "/parent/impersonate";
  };

  return (
    <ImpersonationCtx.Provider value={{ impersonation, stop }}>{children}</ImpersonationCtx.Provider>
  );
}

export function useImpersonation() {
  const ctx = useContext(ImpersonationCtx);
  if (!ctx) throw new Error("useImpersonation outside provider");
  return ctx;
}

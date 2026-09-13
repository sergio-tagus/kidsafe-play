import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import { touchActivity } from "@/lib/sync.functions";
import { isImpersonating } from "@/lib/impersonation";

type SessionCtx = {
  session: Session | null;
  loading: boolean;
  activeChildId: string | null;
  setActiveChildId: (id: string | null) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null);

  useEffect(() => {
    let touched = false;
    /** Mark the account as active so automatic sync stays on (or resumes). */
    const markActive = () => {
      if (touched) return;
      // Impersonated sessions must not fake activity for the real account.
      if (isImpersonating()) return;
      touched = true;
      touchActivity().catch(() => {});
    };

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) markActive();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" && s) markActive();
    });
    const stored = typeof window !== "undefined" ? localStorage.getItem("safetube.childId") : null;
    if (stored) setActiveChildIdState(stored);
    return () => sub.subscription.unsubscribe();
  }, []);

  const setActiveChildId = (id: string | null) => {
    setActiveChildIdState(id);
    if (typeof window !== "undefined") {
      if (id) localStorage.setItem("safetube.childId", id);
      else localStorage.removeItem("safetube.childId");
    }
  };

  const signOut = async () => {
    setActiveChildId(null);
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider value={{ session, loading, activeChildId, setActiveChildId, signOut }}>{children}</Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}

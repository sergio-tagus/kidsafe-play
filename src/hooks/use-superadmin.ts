import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isSuperAdmin } from "@/lib/api-usage.functions";
import { useImpersonation } from "@/lib/impersonation";

/** Client-side check used only to show/hide superuser-only UI. */
export function useIsSuperAdmin() {
  const fn = useServerFn(isSuperAdmin);
  const { impersonation } = useImpersonation();
  const { data, isLoading } = useQuery({
    queryKey: ["is-superadmin", impersonation?.target.id ?? "self"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  // While impersonating, the app must behave exactly like the target user.
  if (impersonation) return { isSuperAdmin: false, isLoading: false };
  return { isSuperAdmin: data?.isSuperAdmin ?? false, isLoading };
}

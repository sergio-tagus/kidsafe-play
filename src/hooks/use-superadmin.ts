import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { isSuperAdmin } from "@/lib/api-usage.functions";

/** Client-side check used only to show/hide superuser-only UI. */
export function useIsSuperAdmin() {
  const fn = useServerFn(isSuperAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["is-superadmin"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });
  return { isSuperAdmin: data?.isSuperAdmin ?? false, isLoading };
}

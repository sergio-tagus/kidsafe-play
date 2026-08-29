import { useEffect, useState, type ReactNode } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { get, set, del } from "idb-keyval";

const CACHE_KEY = "safetube.query-cache";
export const OFFLINE_CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 days

/** IndexedDB-backed persister so the catalogue survives a reload with no network. */
function createIdbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      try {
        await set(CACHE_KEY, client);
      } catch {
        /* quota or private mode — offline cache is best-effort */
      }
    },
    restoreClient: async () => {
      try {
        return await get<PersistedClient>(CACHE_KEY);
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        await del(CACHE_KEY);
      } catch {
        /* ignore */
      }
    },
  };
}

export async function clearOfflineCache() {
  try {
    await del(CACHE_KEY);
  } catch {
    /* ignore */
  }
}

export function OfflinePersistProvider({
  client,
  children,
}: {
  client: QueryClient;
  children: ReactNode;
}) {
  const [persister, setPersister] = useState<Persister | null>(null);

  useEffect(() => {
    setPersister(createIdbPersister());
  }, []);

  // During SSR and the first client render there is no persister yet, so the
  // plain provider keeps markup identical and avoids hydration mismatches.
  if (!persister) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{ persister, maxAge: OFFLINE_CACHE_MAX_AGE, buster: "v1" }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * Single source of truth for React Query cache keys.
 *
 * Keeping them here avoids the drifting string literals that used to live in
 * every route ("wl", "chs", "cw", …) and makes invalidation explicit.
 */
export const qk = {
  kids: () => ["kids"] as const,

  whitelist: () => ["whitelist"] as const,
  channelVideos: (channelId: string) => ["whitelist", "videos", channelId] as const,
  approvedChannels: () => ["approved-channels"] as const,

  categories: () => ["categories"] as const,
  categoriesWithContent: (childId: string) => ["categories", "with-content", childId] as const,

  parentPin: () => ["parent-pin-has"] as const,
  parentStats: (range?: string) => (range ? (["parent-stats", range] as const) : (["parent-stats"] as const)),
  parentHistory: (childId: string) => ["parent-history", childId] as const,

  childVideos: (childId: string, filter: string) => ["child-videos", childId, filter] as const,
  continueWatching: (childId: string) => ["continue-watching", childId] as const,
  history: (childId: string) => ["history", childId] as const,
  favorites: (childId: string) => ["favorites", childId] as const,
  search: (childId: string, q: string, channelId?: string | null) =>
    ["search", childId, q, channelId ?? null] as const,
  video: (childId: string, videoId: string) => ["video", childId, videoId] as const,
  related: (childId: string, channelId?: string) => ["related", childId, channelId ?? null] as const,
  isFavorite: (childId: string, videoId: string) => ["favorite", childId, videoId] as const,
  screenTime: (childId: string) => ["screen-time", childId] as const,
} as const;

/** Everything a child sees is derived from the whitelist and categories. */
export const kidCatalogScopes = [
  ["child-videos"],
  ["continue-watching"],
  ["categories"],
  ["approved-channels"],
  ["search"],
  ["related"],
] as const;

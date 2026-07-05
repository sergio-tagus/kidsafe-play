# SafeTube Kids — Implementation Plan

A child-safe video app where **only whitelisted YouTube channels** are ever displayed. Manual data entry (no YouTube API), embedded IFrame player with strict params, per-child daily screen time synced via Supabase, fixed preset categories.

The app shall support multilanguage, and by default is Spanish.

## Stack

- TanStack Start (React 19 + TS + Vite 7), Tailwind v4
- Lovable Cloud (Supabase) — Postgres, Google OAuth, RLS
- YouTube IFrame Player API (client-only) with `rel=0`, `modestbranding=1`, `controls=1`, `disablekb=1`, `fs=0`, `iv_load_policy=3`

## Design direction

Playful, high-contrast kids UI (rounded-2xl cards, bold gradients, chunky touch targets, Fredoka display + Nunito body). Distinct "kid mode" (colorful) vs "parent mode" (calmer dashboard). Semantic tokens in `src/styles.css`.

## Database schema (migration)

Preset category enum: `cartoons | education | music | science | stories | games | arts | sports`.

Tables (all with GRANTs + RLS):

- `profiles` — mirror of `auth.users` (id, email, name, avatar_url). Auto-created via trigger on signup. Every authenticated user is implicitly the "parent/admin" of their own household. No separate roles table needed for MVP (single-tenant per parent account).
- `child_profiles` — id, parent_user_id (fk auth.users), profile_name, age, avatar_emoji, daily_screen_time_minutes (default 60), created_at
- `whitelist_channels` — id, parent_user_id, youtube_channel_id, channel_name, channel_thumbnail_url, channel_handle, category (enum), active bool, created_at. Unique(parent_user_id, youtube_channel_id).
- `videos_cache` — id, parent_user_id, whitelist_channel_id (fk), youtube_video_id, title, description, thumbnail_url, duration_seconds, published_at, created_at. Unique(parent_user_id, youtube_video_id). Parents add videos manually under a whitelisted channel.
- `watch_history` — id, child_profile_id, youtube_video_id, watched_at, watch_progress_seconds, total_seconds
- `favorites` — id, child_profile_id, youtube_video_id, created_at. Unique(child_profile_id, youtube_video_id).
- `screen_time_daily` — id, child_profile_id, date, minutes_watched. Unique(child_profile_id, date). Enables cross-device daily enforcement.

RLS: every table scoped to `parent_user_id = auth.uid()` (child rows joined via child_profiles.parent_user_id). No anon access anywhere.

## Whitelist enforcement (single source of truth)

All video reads go through **one server function** `listSafeVideos({ filter })` (and `getSafeVideo(id)`) that INNER JOINs `videos_cache` → `whitelist_channels WHERE active=true AND parent_user_id=auth.uid()`. Home sections, search, category pages, channel pages, player, and "recommended" all call this function with different filters (recent, popular-by-history, by-category, by-channel, by-keyword). There is no code path that returns a video without that join — enforced by RLS + the shared query builder.

## Routes (TanStack file-based)

Public:

- `/auth` — "Continue with Google" (uses `lovable.auth.signInWithOAuth("google", ...)`), preserves `?next=`.

Authenticated (`_authenticated/`, managed layout):

- `/` — profile selector (child avatars + "Add profile" + "Parent dashboard" link)
- `/kids/$childId` — kid home (Continue Watching, Recommended, New, Popular, Recently Added Channels)
- `/kids/$childId/search` — safe search (client-side filter over parent's whitelisted videos)
- `/kids/$childId/categories` and `/kids/$childId/categories/$category`
- `/kids/$childId/channels` and `/kids/$childId/channels/$channelId`
- `/kids/$childId/favorites`
- `/kids/$childId/history`
- `/kids/$childId/watch/$videoId` — custom player + safe "up next"
- `/parent` — dashboard (watch time, weekly/monthly charts via Recharts, top channels/categories/videos)
- `/parent/children` — CRUD child profiles + screen-time limit dropdown (30/60/90/120)
- `/parent/whitelist` — add/remove channels, toggle active, assign category
- `/parent/whitelist/$channelId` — add videos under channel (paste video URL/ID → parse → save)
- `/parent/history/$childId` — per-child history review

## Whitelist add flow (manual, no API)

Parent pastes a channel URL (`youtube.com/@handle`, `/channel/UC...`, `/c/name`) or raw channel ID:

1. Client parser extracts handle or channel ID.
2. Parent fills channel name, thumbnail URL, category (dropdown), then confirms.
3. Server function inserts row.

Same pattern for videos under a channel: paste video URL, parse `v=` / `youtu.be/` / `/shorts/`, parent supplies title + thumbnail (defaulted to `https://img.youtube.com/vi/<id>/hqdefault.jpg`) + duration + published date.

## Player + screen time enforcement

- Load YouTube IFrame API on the watch page (client-only, dynamic import).
- On `onStateChange=PLAYING`, start a 15s heartbeat: server fn `recordWatchTick({ childId, videoId, deltaSeconds })` upserts `watch_history` progress and increments `screen_time_daily.minutes_watched`.
- Before load and every tick, server fn `checkScreenTime({ childId })` returns `{ allowed, minutesRemaining, limit }`. When `!allowed`, pause and overlay "Today's viewing limit has been reached." Kid navigation across pages also calls this on mount and blocks the player route.
- "Continue Watching" reads last N rows from `watch_history` where `watch_progress_seconds < total_seconds - 15`.

## Parent dashboard

Recharts: daily bars (last 7d), monthly line (last 30d), donut of top categories, top-5 channels table, top-10 videos, per-child cards showing today's minutes / limit / progress ring.

## Server functions (`src/lib/*.functions.ts`, all `requireSupabaseAuth`)

- `listChildProfiles`, `createChildProfile`, `updateChildProfile`, `deleteChildProfile`
- `listWhitelistChannels`, `addWhitelistChannel`, `updateWhitelistChannel`, `deleteWhitelistChannel`
- `listChannelVideos`, `addVideo`, `deleteVideo`
- `listSafeVideos({ childId, filter, category?, channelId?, query?, limit })`, `getSafeVideo({ childId, videoId })`
- `listFavorites`, `toggleFavorite`
- `listHistory`, `recordWatchTick`, `checkScreenTime`
- `getParentStats({ range })`

## Auth

- Google OAuth via `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth/callback" })`.
- `/auth/callback` (public) waits for session then navigates to `?next=` or `/`.
- Enable Google provider with `supabase--configure_social_auth` in the same turn.
- Root `onAuthStateChange` wired in `__root.tsx` per template rules.

## Head metadata

Real app-specific title/description in `__root.tsx` ("SafeTube Kids — A safer video world for children"). Per-route heads on `/auth`, `/parent`, etc.

## Out of scope (MVP)

- No YouTube Data API integration (manual metadata entry).
- No text search over YouTube — search only filters parent's own whitelisted videos.
- No multi-parent households / role table (single owner per account). Can add `user_roles` later if needed.
- No mobile push notifications, no offline playback.

## Build order

1. Enable Lovable Cloud + configure Google auth.
2. Migration: enum, tables, GRANTs, RLS, profile trigger.
3. Design tokens + fonts + layout shells (kid vs parent).
4. Auth + profile selector.
5. Parent: children CRUD, whitelist CRUD, video CRUD.
6. Kid: home, categories, channels, favorites, history, search.
7. Player + screen time enforcement.
8. Parent dashboard charts.
9. Polish + verify whitelist enforcement end-to-end.
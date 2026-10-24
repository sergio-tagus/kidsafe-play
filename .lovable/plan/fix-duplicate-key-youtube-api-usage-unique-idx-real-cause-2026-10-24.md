# Fix "duplicate key ... youtube_api_usage_unique_idx" (real cause)

## What's really happening
The error comes from **deleting a channel**, not from syncing. That's also why Dude Perfect can't be deleted.

- When a channel is deleted, its YouTube usage records are kept but get unlinked from it (they become "no channel" records).
- A channel deleted before left "no channel" records for 2026-08-31 (channels, playlistItems, videos).
- Dude Perfect has records for the same day and the same operations. Unlinking them creates a second "no channel" record for each one, so the deletion is rejected as a duplicate.

The earlier fix (adding usage up in one step) still helps during syncs, but it doesn't cover deletions.

## Fix
1. Before a channel is deleted, the database adds its usage into the matching "no channel" records (per day and operation) and then removes the channel's own records. The deletion then goes ahead with no collision. Usage totals in "Consumo API" stay exactly the same.
2. Check: delete Dude Perfect in a test that is undone afterwards, and confirm it no longer fails and the daily totals don't change.

## Technical details
- Migration: `BEFORE DELETE` trigger on `public.whitelist_channels`, `SECURITY DEFINER`, `search_path=public`. For each `youtube_api_usage` row with `whitelist_channel_id = OLD.id`, run `INSERT ... (whitelist_channel_id NULL) ON CONFLICT (parent_user_id, day, operation, COALESCE(whitelist_channel_id, zero-uuid)) DO UPDATE SET units = units + EXCLUDED.units, calls = calls + EXCLUDED.calls`, then `DELETE` the channel's rows. The existing FK (ON DELETE SET NULL) then has nothing left to update.
- No code changes in the app; the delete already shows errors through `handleParentActionError`.

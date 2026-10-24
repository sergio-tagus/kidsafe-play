# Fix "duplicate key ... youtube_api_usage_unique_idx"

## Cause
When several channels sync at the same moment (bulk sync or "sync all"), each one checks "is there already a usage row for today?", sees none, and tries to create it. The second one collides with the first and fails. Usage accounting runs as read-then-insert, so two at once race.

## Fix
1. Add a database function `increment_youtube_usage(parent, day, operation, channel, units, calls)` that does a single atomic `INSERT ... ON CONFLICT (parent_user_id, day, operation, COALESCE(whitelist_channel_id, zero-uuid)) DO UPDATE SET units = units + EXCLUDED.units, calls = calls + EXCLUDED.calls`. SECURITY INVOKER, so the existing "own api usage" policy still applies; grant EXECUTE to authenticated and service_role.
2. Rewrite `recordUsage` in `src/lib/api-usage.server.ts` to call that function via `supabase.rpc(...)` once per operation instead of select + insert/update. It stays non-throwing and logs any error.
3. Check that the error no longer appears by running a sync of several channels at once.

No data is lost or changed; existing usage totals are kept.

ALTER TABLE public.whitelist_channels
  ADD COLUMN IF NOT EXISTS pending_updates jsonb,
  ADD COLUMN IF NOT EXISTS pending_updates_at timestamptz;
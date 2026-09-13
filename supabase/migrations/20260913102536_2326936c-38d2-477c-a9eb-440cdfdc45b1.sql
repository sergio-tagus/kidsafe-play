ALTER TABLE public.sync_settings
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS auto_paused boolean NOT NULL DEFAULT false;

ALTER TABLE public.sync_settings
  ALTER COLUMN frequency SET DEFAULT 'biweekly'::public.sync_frequency;

UPDATE public.sync_settings
  SET frequency = 'biweekly'::public.sync_frequency
  WHERE frequency <> 'off'::public.sync_frequency;
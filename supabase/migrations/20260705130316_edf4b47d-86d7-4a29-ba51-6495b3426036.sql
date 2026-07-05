
CREATE TYPE public.sync_frequency AS ENUM ('off', 'daily', 'weekly', 'monthly');

CREATE TABLE public.sync_settings (
  parent_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  frequency public.sync_frequency NOT NULL DEFAULT 'weekly',
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_settings TO authenticated;
GRANT ALL ON public.sync_settings TO service_role;

ALTER TABLE public.sync_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parents manage their own sync settings"
  ON public.sync_settings FOR ALL
  USING (auth.uid() = parent_user_id)
  WITH CHECK (auth.uid() = parent_user_id);

CREATE OR REPLACE FUNCTION public.sync_settings_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_settings_updated_at
  BEFORE UPDATE ON public.sync_settings
  FOR EACH ROW EXECUTE FUNCTION public.sync_settings_touch_updated_at();

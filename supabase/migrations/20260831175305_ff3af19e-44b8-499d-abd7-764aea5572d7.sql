CREATE TABLE public.youtube_api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  operation text NOT NULL,
  units integer NOT NULL DEFAULT 0,
  calls integer NOT NULL DEFAULT 0,
  whitelist_channel_id uuid REFERENCES public.whitelist_channels(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX youtube_api_usage_unique_idx
  ON public.youtube_api_usage (parent_user_id, day, operation, COALESCE(whitelist_channel_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX youtube_api_usage_day_idx ON public.youtube_api_usage (parent_user_id, day DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_api_usage TO authenticated;
GRANT ALL ON public.youtube_api_usage TO service_role;
ALTER TABLE public.youtube_api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own api usage" ON public.youtube_api_usage FOR ALL TO authenticated
  USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

CREATE TABLE public.youtube_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'manual',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  channels_processed integer NOT NULL DEFAULT 0,
  videos_imported integer NOT NULL DEFAULT 0,
  units_used integer NOT NULL DEFAULT 0,
  errors jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX youtube_sync_runs_user_idx ON public.youtube_sync_runs (parent_user_id, started_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.youtube_sync_runs TO authenticated;
GRANT ALL ON public.youtube_sync_runs TO service_role;
ALTER TABLE public.youtube_sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own sync runs" ON public.youtube_sync_runs FOR ALL TO authenticated
  USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

CREATE TABLE public.api_quota_settings (
  parent_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_quota integer NOT NULL DEFAULT 10000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_quota_settings TO authenticated;
GRANT ALL ON public.api_quota_settings TO service_role;
ALTER TABLE public.api_quota_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quota settings" ON public.api_quota_settings FOR ALL TO authenticated
  USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

CREATE OR REPLACE FUNCTION public.api_usage_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER youtube_api_usage_updated_at BEFORE UPDATE ON public.youtube_api_usage
  FOR EACH ROW EXECUTE FUNCTION public.api_usage_touch_updated_at();
CREATE TRIGGER api_quota_settings_updated_at BEFORE UPDATE ON public.api_quota_settings
  FOR EACH ROW EXECUTE FUNCTION public.api_usage_touch_updated_at();
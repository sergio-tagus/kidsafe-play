ALTER TABLE public.screen_time_daily ADD COLUMN IF NOT EXISTS bonus_minutes numeric NOT NULL DEFAULT 0;
CREATE TABLE public.screen_time_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL,
  date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (child_profile_id, date)
);
GRANT SELECT ON public.screen_time_alerts TO authenticated;
GRANT ALL ON public.screen_time_alerts TO service_role;
ALTER TABLE public.screen_time_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents read own alerts" ON public.screen_time_alerts FOR SELECT TO authenticated USING (parent_id = auth.uid());
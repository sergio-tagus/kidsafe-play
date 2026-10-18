-- parent_pins: only server code (service role) may write PIN / unlock window.
DROP POLICY IF EXISTS "own pin insert" ON public.parent_pins;
DROP POLICY IF EXISTS "own pin update" ON public.parent_pins;
DROP POLICY IF EXISTS "own pin delete" ON public.parent_pins;
REVOKE INSERT, UPDATE, DELETE ON public.parent_pins FROM authenticated, anon;
GRANT SELECT ON public.parent_pins TO authenticated;
GRANT ALL ON public.parent_pins TO service_role;

-- screen_time_daily: users may read, only server code records viewing time.
DROP POLICY IF EXISTS "Parents manage kid screen time" ON public.screen_time_daily;
CREATE POLICY "Parents read kid screen time" ON public.screen_time_daily
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = screen_time_daily.child_profile_id AND cp.parent_user_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.screen_time_daily FROM authenticated, anon;
GRANT SELECT ON public.screen_time_daily TO authenticated;
GRANT ALL ON public.screen_time_daily TO service_role;

-- categories: default ones for everyone, custom ones only for their creator.
DROP POLICY IF EXISTS "Authenticated can read categories" ON public.categories;
CREATE POLICY "Read default or own categories" ON public.categories
  FOR SELECT TO authenticated
  USING (is_default = true OR created_by = auth.uid());
CREATE TABLE public.impersonation_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE ON public.impersonation_logs TO authenticated;
GRANT ALL ON public.impersonation_logs TO service_role;

ALTER TABLE public.impersonation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin reads impersonation logs" ON public.impersonation_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "superadmin inserts impersonation logs" ON public.impersonation_logs
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'superadmin') AND actor_user_id = auth.uid());
CREATE POLICY "superadmin updates own impersonation logs" ON public.impersonation_logs
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'superadmin') AND actor_user_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'superadmin') AND actor_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.search_users(term text)
RETURNS TABLE (id uuid, email text, name text, avatar_url text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'superadmin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email, p.name, p.avatar_url
    FROM public.profiles p
    WHERE term IS NULL OR term = '' OR p.email ILIKE '%' || term || '%' OR p.name ILIKE '%' || term || '%'
    ORDER BY p.name NULLS LAST
    LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.search_users(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_users(text) TO authenticated;
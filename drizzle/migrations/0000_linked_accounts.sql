CREATE TABLE public.linked_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  linked_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
GRANT SELECT, INSERT, DELETE ON public.linked_accounts TO authenticated;
GRANT ALL ON public.linked_accounts TO service_role;
ALTER TABLE public.linked_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own linked select" ON public.linked_accounts FOR SELECT TO authenticated USING (auth.uid() = primary_user_id);
CREATE POLICY "own linked insert" ON public.linked_accounts FOR INSERT TO authenticated WITH CHECK (auth.uid() = primary_user_id AND email = lower(email));
CREATE POLICY "own linked delete" ON public.linked_accounts FOR DELETE TO authenticated USING (auth.uid() = primary_user_id);
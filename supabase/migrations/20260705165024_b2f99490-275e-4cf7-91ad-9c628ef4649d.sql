
-- 1) Categories: add ownership + owner-scoped write policies
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Authenticated can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated can update categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated can delete non-default categories" ON public.categories;

CREATE POLICY "Users insert own categories"
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_default = false);

CREATE POLICY "Users update own non-default categories"
  ON public.categories FOR UPDATE TO authenticated
  USING (created_by = auth.uid() AND is_default = false)
  WITH CHECK (created_by = auth.uid() AND is_default = false);

CREATE POLICY "Users delete own non-default categories"
  ON public.categories FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND is_default = false);

-- 2) Parent PIN: server-side unlock window
ALTER TABLE public.parent_pins
  ADD COLUMN IF NOT EXISTS unlocked_until timestamptz;

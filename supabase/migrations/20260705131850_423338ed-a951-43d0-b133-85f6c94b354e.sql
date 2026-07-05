
-- 1. Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_es TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_pt TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  color TEXT,
  sort_order INT NOT NULL DEFAULT 100,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read categories" ON public.categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert categories" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update categories" ON public.categories
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete non-default categories" ON public.categories
  FOR DELETE TO authenticated USING (is_default = false);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.categories_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER categories_touch_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_touch_updated_at();

-- Prevent deletion of default categories
CREATE OR REPLACE FUNCTION public.categories_prevent_default_delete()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.is_default THEN
    RAISE EXCEPTION 'Cannot delete a default category';
  END IF;
  RETURN OLD;
END; $$;

CREATE TRIGGER categories_prevent_default_delete
  BEFORE DELETE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.categories_prevent_default_delete();

-- 2. Seed default categories
INSERT INTO public.categories (slug, name_es, name_en, name_pt, icon, color, sort_order, is_default) VALUES
  ('cartoons',  'Dibujos',   'Cartoons',  'Desenhos',   'Palette',       '#F472B6', 10, true),
  ('education', 'Educación', 'Education', 'Educação',   'GraduationCap', '#60A5FA', 20, true),
  ('music',     'Música',    'Music',     'Música',     'Music',         '#FBBF24', 30, true),
  ('science',   'Ciencia',   'Science',   'Ciência',    'FlaskConical',  '#34D399', 40, true),
  ('stories',   'Cuentos',   'Stories',   'Histórias',  'BookOpen',      '#A78BFA', 50, true),
  ('games',     'Juegos',    'Games',     'Jogos',      'Gamepad2',      '#F87171', 60, true),
  ('arts',      'Arte',      'Arts',      'Arte',       'Brush',         '#FB923C', 70, true),
  ('sports',    'Deportes',  'Sports',    'Esportes',   'Trophy',        '#22D3EE', 80, true);

-- 3. Convert whitelist_channels.category from enum to text FK
ALTER TABLE public.whitelist_channels
  ALTER COLUMN category TYPE TEXT USING category::text;

ALTER TABLE public.whitelist_channels
  ALTER COLUMN category DROP DEFAULT;

ALTER TABLE public.whitelist_channels
  ADD CONSTRAINT whitelist_channels_category_fkey
  FOREIGN KEY (category) REFERENCES public.categories(slug)
  ON UPDATE CASCADE ON DELETE SET NULL;

-- 4. Drop the enum type (no longer referenced)
DROP TYPE public.video_category;

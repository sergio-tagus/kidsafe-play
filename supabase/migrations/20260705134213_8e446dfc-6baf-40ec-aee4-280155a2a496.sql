-- Parent PIN table
CREATE TABLE public.parent_pins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_pins TO authenticated;
GRANT ALL ON public.parent_pins TO service_role;

ALTER TABLE public.parent_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pin select" ON public.parent_pins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own pin insert" ON public.parent_pins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own pin update" ON public.parent_pins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own pin delete" ON public.parent_pins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.parent_pins_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER parent_pins_updated_at BEFORE UPDATE ON public.parent_pins
FOR EACH ROW EXECUTE FUNCTION public.parent_pins_touch_updated_at();

-- Channel recommendations cache
CREATE TABLE public.channel_recommendations_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.channel_recommendations_cache TO authenticated;
GRANT ALL ON public.channel_recommendations_cache TO service_role;

ALTER TABLE public.channel_recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rec select" ON public.channel_recommendations_cache FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rec insert" ON public.channel_recommendations_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rec update" ON public.channel_recommendations_cache FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rec delete" ON public.channel_recommendations_cache FOR DELETE TO authenticated USING (auth.uid() = user_id);
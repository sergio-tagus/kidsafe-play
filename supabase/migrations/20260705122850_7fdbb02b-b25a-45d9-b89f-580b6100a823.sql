
-- Category enum
CREATE TYPE public.video_category AS ENUM ('cartoons','education','music','science','stories','games','arts','sports');

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- child_profiles
CREATE TABLE public.child_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_name TEXT NOT NULL,
  age INT,
  avatar_emoji TEXT NOT NULL DEFAULT '🦁',
  daily_screen_time_minutes INT NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.child_profiles(parent_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage own kids" ON public.child_profiles FOR ALL USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

-- whitelist_channels
CREATE TABLE public.whitelist_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  youtube_channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_handle TEXT,
  channel_thumbnail_url TEXT,
  category public.video_category NOT NULL DEFAULT 'education',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, youtube_channel_id)
);
CREATE INDEX ON public.whitelist_channels(parent_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whitelist_channels TO authenticated;
GRANT ALL ON public.whitelist_channels TO service_role;
ALTER TABLE public.whitelist_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage own whitelist" ON public.whitelist_channels FOR ALL USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

-- videos_cache
CREATE TABLE public.videos_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  whitelist_channel_id UUID NOT NULL REFERENCES public.whitelist_channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(parent_user_id, youtube_video_id)
);
CREATE INDEX ON public.videos_cache(parent_user_id);
CREATE INDEX ON public.videos_cache(whitelist_channel_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos_cache TO authenticated;
GRANT ALL ON public.videos_cache TO service_role;
ALTER TABLE public.videos_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage own videos" ON public.videos_cache FOR ALL USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

-- watch_history
CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  watched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  watch_progress_seconds INT NOT NULL DEFAULT 0,
  total_seconds INT
);
CREATE INDEX ON public.watch_history(child_profile_id, watched_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated;
GRANT ALL ON public.watch_history TO service_role;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage kid history" ON public.watch_history FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()));

-- favorites
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(child_profile_id, youtube_video_id)
);
CREATE INDEX ON public.favorites(child_profile_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage kid favorites" ON public.favorites FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()));

-- screen_time_daily
CREATE TABLE public.screen_time_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id UUID NOT NULL REFERENCES public.child_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  minutes_watched NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(child_profile_id, date)
);
CREATE INDEX ON public.screen_time_daily(child_profile_id, date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.screen_time_daily TO authenticated;
GRANT ALL ON public.screen_time_daily TO service_role;
ALTER TABLE public.screen_time_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents manage kid screen time" ON public.screen_time_daily FOR ALL
  USING (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.child_profiles cp WHERE cp.id = child_profile_id AND cp.parent_user_id = auth.uid()));

-- Auto profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

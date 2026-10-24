CREATE OR REPLACE FUNCTION public.increment_youtube_usage(_parent uuid, _day date, _operation text, _channel uuid, _units integer, _calls integer)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  INSERT INTO public.youtube_api_usage (parent_user_id, day, operation, whitelist_channel_id, units, calls)
  VALUES (_parent, _day, _operation, _channel, _units, _calls)
  ON CONFLICT (parent_user_id, day, operation, COALESCE(whitelist_channel_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET units = public.youtube_api_usage.units + EXCLUDED.units,
                calls = public.youtube_api_usage.calls + EXCLUDED.calls;
$$;
REVOKE ALL ON FUNCTION public.increment_youtube_usage(uuid, date, text, uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_youtube_usage(uuid, date, text, uuid, integer, integer) TO authenticated, service_role;
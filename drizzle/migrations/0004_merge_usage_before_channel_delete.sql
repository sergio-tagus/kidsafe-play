CREATE OR REPLACE FUNCTION public.whitelist_channels_merge_usage_on_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.youtube_api_usage (parent_user_id, day, operation, whitelist_channel_id, units, calls)
  SELECT parent_user_id, day, operation, NULL, SUM(units), SUM(calls)
  FROM public.youtube_api_usage
  WHERE whitelist_channel_id = OLD.id
  GROUP BY parent_user_id, day, operation
  ON CONFLICT (parent_user_id, day, operation, COALESCE(whitelist_channel_id, '00000000-0000-0000-0000-000000000000'::uuid))
  DO UPDATE SET units = public.youtube_api_usage.units + EXCLUDED.units,
                calls = public.youtube_api_usage.calls + EXCLUDED.calls;
  DELETE FROM public.youtube_api_usage WHERE whitelist_channel_id = OLD.id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.whitelist_channels_merge_usage_on_delete() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER whitelist_channels_merge_usage_before_delete
BEFORE DELETE ON public.whitelist_channels
FOR EACH ROW EXECUTE FUNCTION public.whitelist_channels_merge_usage_on_delete();
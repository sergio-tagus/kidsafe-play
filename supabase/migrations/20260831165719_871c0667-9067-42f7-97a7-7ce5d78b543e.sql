ALTER TABLE public.whitelist_channels ALTER COLUMN language SET DEFAULT 'unknown';
UPDATE public.whitelist_channels SET language = 'unknown' WHERE language IS NULL OR btrim(language) = '';
ALTER TABLE public.whitelist_channels ALTER COLUMN language SET NOT NULL;
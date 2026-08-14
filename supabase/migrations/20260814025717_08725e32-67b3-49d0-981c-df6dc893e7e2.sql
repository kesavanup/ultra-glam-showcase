CREATE TABLE IF NOT EXISTS public.admins (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admins TO authenticated;
GRANT ALL ON public.admins TO service_role;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read admin list" ON public.admins;
CREATE POLICY "Admins can read admin list" ON public.admins
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

INSERT INTO public.admins (email) VALUES ('dot3up@gmail.com')
ON CONFLICT (email) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins a
    WHERE lower(a.email) = lower(coalesce(auth.jwt() ->> 'email',''))
  );
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_sections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT SELECT ON public.portfolio_items TO anon;
GRANT SELECT ON public.portfolio_categories TO anon;
GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT ON public.site_content TO anon;
GRANT ALL ON public.portfolio_items TO service_role;
GRANT ALL ON public.portfolio_categories TO service_role;
GRANT ALL ON public.page_sections TO service_role;
GRANT ALL ON public.site_content TO service_role;

DROP POLICY IF EXISTS "Admins manage portfolio items" ON public.portfolio_items;
CREATE POLICY "Admins manage portfolio items" ON public.portfolio_items
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage categories" ON public.portfolio_categories;
CREATE POLICY "Admins manage categories" ON public.portfolio_categories
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage sections" ON public.page_sections;
CREATE POLICY "Admins manage sections" ON public.page_sections
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins manage site content" ON public.site_content;
CREATE POLICY "Admins manage site content" ON public.site_content
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins read all sections" ON public.page_sections;
CREATE POLICY "Admins read all sections" ON public.page_sections
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Admins read all items" ON public.portfolio_items;
CREATE POLICY "Admins read all items" ON public.portfolio_items
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "Public read portfolio media" ON storage.objects;
CREATE POLICY "Public read portfolio media" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'portfolio');

DROP POLICY IF EXISTS "Admins upload portfolio media" ON storage.objects;
CREATE POLICY "Admins upload portfolio media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'portfolio' AND public.is_admin());

DROP POLICY IF EXISTS "Admins update portfolio media" ON storage.objects;
CREATE POLICY "Admins update portfolio media" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'portfolio' AND public.is_admin());

DROP POLICY IF EXISTS "Admins delete portfolio media" ON storage.objects;
CREATE POLICY "Admins delete portfolio media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'portfolio' AND public.is_admin());
CREATE POLICY "Public read portfolio bucket" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'portfolio');
GRANT SELECT ON public.portfolio_items TO anon;
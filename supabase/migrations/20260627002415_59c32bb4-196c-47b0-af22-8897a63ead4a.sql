CREATE POLICY "Public read portfolio media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'portfolio');

CREATE POLICY "Service role write portfolio media"
  ON storage.objects FOR ALL
  USING (bucket_id = 'portfolio')
  WITH CHECK (bucket_id = 'portfolio');
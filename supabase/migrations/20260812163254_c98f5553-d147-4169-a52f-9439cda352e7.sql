CREATE POLICY "Buddies read shared trade screenshots"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'trade-screenshots'
  AND public.has_journal_access(((storage.foldername(name))[1])::uuid)
);
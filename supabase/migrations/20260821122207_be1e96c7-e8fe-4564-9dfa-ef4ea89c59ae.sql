ALTER TABLE public.trades REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trades'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trades;
  END IF;
END $$;
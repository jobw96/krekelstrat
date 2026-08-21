-- Live meekijken op trades.
--
-- De journalpagina haalt trades op met react-query en ververst alleen na je
-- eigen handeling. Wie meekijkt in een gedeeld journal, of hetzelfde journal
-- in een tweede tab open heeft, zag een toegevoegde trade pas na een refresh.
-- Met de tabel in de realtime-publicatie stuurt Postgres de wijziging door en
-- kan de client zichzelf bijwerken.

-- Zonder FULL stuurt een DELETE alleen de primaire sleutel mee. Realtime kan
-- de rij dan niet langs de RLS-policy houden en levert het bericht niet af,
-- waardoor een verwijderde trade bij de meekijker zou blijven staan.
ALTER TABLE public.trades REPLICA IDENTITY FULL;

-- ADD TABLE geeft een fout als de tabel er al in zit, en migraties kunnen
-- opnieuw langskomen. Vandaar de controle vooraf.
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

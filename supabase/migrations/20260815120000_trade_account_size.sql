-- Split the journal per prop account size (25K / 50K / 150K / 250K).
-- NOT NULL with a default of 25000 backfills every existing trade into the
-- 25K journal, which is where they were all logged before this split.
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS account_size integer NOT NULL DEFAULT 25000;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS went_right text,
  ADD COLUMN IF NOT EXISTS went_wrong text,
  ADD COLUMN IF NOT EXISTS improvement text;
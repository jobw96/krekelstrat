ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS prop_account_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trades_prop_account_id_fkey'
  ) THEN
    ALTER TABLE public.trades
      ADD CONSTRAINT trades_prop_account_id_fkey
      FOREIGN KEY (prop_account_id) REFERENCES public.prop_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS trades_prop_account_id_idx ON public.trades (prop_account_id);

ALTER TABLE public.prop_accounts ADD COLUMN IF NOT EXISTS profit_target numeric NOT NULL DEFAULT 0;
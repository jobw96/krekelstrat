CREATE TABLE public.prop_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm text NOT NULL,
  account_size numeric,
  phase text NOT NULL DEFAULT 'evaluation',
  status text NOT NULL DEFAULT 'in_progress',
  cost numeric NOT NULL DEFAULT 0,
  activation_fee numeric NOT NULL DEFAULT 0,
  payout_total numeric NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  passed_at timestamp with time zone,
  breached_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.prop_accounts TO authenticated;
GRANT ALL ON public.prop_accounts TO service_role;

ALTER TABLE public.prop_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own prop accounts"
ON public.prop_accounts FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_prop_accounts_updated_at
BEFORE UPDATE ON public.prop_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.journal_shares (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_email text,
  shared_with_email text not null,
  shared_with_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  hide_dollar_amounts boolean not null default false,
  created_at timestamptz not null default now(),
  unique (owner_id, shared_with_email)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_shares TO authenticated;
GRANT ALL ON public.journal_shares TO service_role;

ALTER TABLE public.journal_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their shares" ON public.journal_shares
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Recipients can read their invites" ON public.journal_shares
  FOR SELECT TO authenticated
  USING (auth.uid() = shared_with_user_id);

CREATE POLICY "Recipients can respond to invites" ON public.journal_shares
  FOR UPDATE TO authenticated
  USING (auth.uid() = shared_with_user_id) WITH CHECK (auth.uid() = shared_with_user_id);

-- Security definer helper: does the current user have accepted read access to `_owner`'s journal?
CREATE OR REPLACE FUNCTION public.has_journal_access(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journal_shares s
    WHERE s.owner_id = _owner
      AND s.shared_with_user_id = auth.uid()
      AND s.status = 'accepted'
  );
$$;

-- Link pending invites addressed to the caller's email to their account.
CREATE OR REPLACE FUNCTION public.claim_journal_shares()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  n integer;
  em text;
BEGIN
  SELECT email INTO em FROM auth.users WHERE id = auth.uid();
  IF em IS NULL THEN RETURN 0; END IF;
  UPDATE public.journal_shares
     SET shared_with_user_id = auth.uid()
   WHERE shared_with_user_id IS NULL
     AND lower(shared_with_email) = lower(em);
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_journal_shares() FROM public;
GRANT EXECUTE ON FUNCTION public.claim_journal_shares() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_journal_access(uuid) TO authenticated;

CREATE POLICY "Buddies can read shared trades" ON public.trades
  FOR SELECT TO authenticated
  USING (public.has_journal_access(user_id));

CREATE POLICY "Buddies can read shared strategies" ON public.strategies
  FOR SELECT TO authenticated
  USING (public.has_journal_access(user_id));

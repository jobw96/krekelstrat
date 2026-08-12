CREATE OR REPLACE FUNCTION public.can_view_trade(_trade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = _trade_id
      AND (t.user_id = auth.uid() OR public.has_journal_access(t.user_id))
  );
$$;

CREATE TABLE public.trade_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trade_comments_trade_id_idx ON public.trade_comments(trade_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_comments TO authenticated;
GRANT ALL ON public.trade_comments TO service_role;

ALTER TABLE public.trade_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Viewers of a trade can read comments"
ON public.trade_comments FOR SELECT TO authenticated
USING (public.can_view_trade(trade_id));

CREATE POLICY "Viewers of a trade can comment"
ON public.trade_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND public.can_view_trade(trade_id));

CREATE POLICY "Users can edit own comments"
ON public.trade_comments FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
ON public.trade_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_trade_comments_updated_at
BEFORE UPDATE ON public.trade_comments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
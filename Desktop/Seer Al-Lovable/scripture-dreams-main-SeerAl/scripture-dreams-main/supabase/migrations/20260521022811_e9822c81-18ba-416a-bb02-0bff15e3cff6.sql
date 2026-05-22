
CREATE TABLE IF NOT EXISTS public.impartation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan_at_join TEXT NOT NULL,
  cohort TEXT NOT NULL DEFAULT 'cohort-1',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  price_locked NUMERIC NOT NULL DEFAULT 97.00,
  stripe_subscription_id TEXT,
  shopify_order_id TEXT
);

ALTER TABLE public.impartation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their own record"
  ON public.impartation_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can join"
  ON public.impartation_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.impartation_seats_remaining
WITH (security_invoker = true) AS
SELECT
  GREATEST(50 - COUNT(*), 0)::int AS seats_remaining,
  COUNT(*)::int AS seats_taken,
  50 AS total_seats,
  'cohort-1'::text AS cohort
FROM public.impartation_members
WHERE cohort = 'cohort-1' AND status = 'active';

GRANT SELECT ON public.impartation_seats_remaining TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.impartation_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.impartation_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist with valid email"
  ON public.impartation_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

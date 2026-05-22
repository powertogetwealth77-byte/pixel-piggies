
CREATE TABLE public.watchroom_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cohort TEXT NOT NULL DEFAULT 'cohort-1',
  status TEXT NOT NULL DEFAULT 'active'
);

ALTER TABLE public.watchroom_members ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can read the count via the view; deny direct table reads of PII to anon.
CREATE POLICY "Members can view their own membership"
  ON public.watchroom_members FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can join"
  ON public.watchroom_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Public seat count view (no PII)
CREATE OR REPLACE VIEW public.watchroom_seats_remaining AS
SELECT
  cohort,
  GREATEST(0, 50 - COUNT(*)::int) AS seats_remaining,
  COUNT(*)::int AS seats_taken
FROM public.watchroom_members
WHERE status = 'active'
GROUP BY cohort;

GRANT SELECT ON public.watchroom_seats_remaining TO anon, authenticated;

-- Waitlist when sold out
CREATE TABLE public.watchroom_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.watchroom_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
  ON public.watchroom_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

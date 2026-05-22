
ALTER VIEW public.watchroom_seats_remaining SET (security_invoker = true);

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.watchroom_waitlist;
CREATE POLICY "Anyone can join waitlist with valid email"
  ON public.watchroom_waitlist FOR INSERT
  TO anon, authenticated
  WITH CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

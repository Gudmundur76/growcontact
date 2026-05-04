-- Explicit restrictive SELECT/UPDATE/DELETE deny policies on contact_submissions
-- Reinforces default-deny RLS and is resilient to accidental misconfiguration.

CREATE POLICY "No public reads on contact submissions"
  ON public.contact_submissions
  AS RESTRICTIVE
  FOR SELECT
  TO anon, authenticated
  USING (false);

CREATE POLICY "No public updates on contact submissions"
  ON public.contact_submissions
  AS RESTRICTIVE
  FOR UPDATE
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No public deletes on contact submissions"
  ON public.contact_submissions
  AS RESTRICTIVE
  FOR DELETE
  TO anon, authenticated
  USING (false);

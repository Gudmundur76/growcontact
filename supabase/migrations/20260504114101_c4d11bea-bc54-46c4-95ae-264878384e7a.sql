CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  team_size TEXT,
  message TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anon + authenticated) to insert a submission
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(name) BETWEEN 1 AND 100
    AND char_length(email) BETWEEN 3 AND 255
    AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND char_length(message) BETWEEN 1 AND 5000
    AND (company IS NULL OR char_length(company) <= 200)
    AND (team_size IS NULL OR char_length(team_size) <= 50)
  );

-- No SELECT/UPDATE/DELETE policies → blocked for everyone via the public API.

CREATE INDEX contact_submissions_created_at_idx
  ON public.contact_submissions (created_at DESC);
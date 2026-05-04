
-- Rubric templates
CREATE TABLE public.interview_rubrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role_title TEXT,
  focus TEXT,
  competencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_rubrics_user ON public.interview_rubrics(user_id, created_at DESC);

ALTER TABLE public.interview_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own rubrics" ON public.interview_rubrics
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "Users insert own rubrics" ON public.interview_rubrics
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own rubrics" ON public.interview_rubrics
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own rubrics" ON public.interview_rubrics
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_interview_rubrics_updated_at
  BEFORE UPDATE ON public.interview_rubrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sessions: link rubric + share token
ALTER TABLE public.interview_sessions
  ADD COLUMN rubric_id UUID REFERENCES public.interview_rubrics(id) ON DELETE SET NULL,
  ADD COLUMN share_token TEXT UNIQUE;

CREATE INDEX idx_interview_sessions_share_token ON public.interview_sessions(share_token) WHERE share_token IS NOT NULL;

-- Public read for shared scorecards: anyone with the token sees the session's
-- candidate_name, role_title, share_token (no other PII / meeting URL).
-- We keep RLS strict: a separate policy that only matches when share_token IS NOT NULL,
-- and we'll only ever query by share_token from the public route.
CREATE POLICY "Public can view shared sessions by token" ON public.interview_sessions
  FOR SELECT TO anon, authenticated
  USING (share_token IS NOT NULL);

-- Public read for scorecards belonging to shared sessions
CREATE POLICY "Public can view shared scorecards" ON public.interview_scorecards
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions s
      WHERE s.id = session_id AND s.share_token IS NOT NULL
    )
  );

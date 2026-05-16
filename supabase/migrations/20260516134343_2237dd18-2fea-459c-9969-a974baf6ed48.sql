-- =========================================
-- Screening: screeners
-- =========================================
CREATE TABLE public.screening_screeners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  role_title text,
  format text NOT NULL DEFAULT 'text' CHECK (format IN ('text', 'code', 'video')),
  description text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  rubric jsonb NOT NULL DEFAULT '[]'::jsonb,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  share_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_screeners_user ON public.screening_screeners(user_id);
CREATE INDEX idx_screeners_share_token ON public.screening_screeners(share_token);

ALTER TABLE public.screening_screeners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own screeners"
  ON public.screening_screeners FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own screeners"
  ON public.screening_screeners FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own screeners"
  ON public.screening_screeners FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own screeners"
  ON public.screening_screeners FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public can SELECT a screener only when fetched by share_token via a server function.
-- To keep token enumeration safe we DO NOT expose anon SELECT; the server function
-- uses the service role / admin client to look up by token. No anon policy needed.

CREATE TRIGGER trg_screeners_updated_at
  BEFORE UPDATE ON public.screening_screeners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Screening: submissions
-- =========================================
CREATE TABLE public.screening_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screener_id uuid NOT NULL REFERENCES public.screening_screeners(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  candidate_name text NOT NULL,
  candidate_email text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_score integer,
  ai_summary text,
  ai_recommendation text,
  ai_strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_concerns jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scoring', 'scored', 'reviewed', 'failed')),
  error_message text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  scored_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_screener ON public.screening_submissions(screener_id);
CREATE INDEX idx_submissions_user ON public.screening_submissions(user_id);
CREATE INDEX idx_submissions_score ON public.screening_submissions(ai_score DESC NULLS LAST);

ALTER TABLE public.screening_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions"
  ON public.screening_submissions FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users update own submissions"
  ON public.screening_submissions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own submissions"
  ON public.screening_submissions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Inserts come from the server function using the admin client (token-validated),
-- so no anon INSERT policy is added.

CREATE TRIGGER trg_submissions_updated_at
  BEFORE UPDATE ON public.screening_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Analytics: cached forecasts
-- =========================================
CREATE TABLE public.analytics_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('time_to_hire', 'offer_acceptance', 'retention')),
  entity_id uuid,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour')
);

CREATE INDEX idx_forecasts_user_kind ON public.analytics_forecasts(user_id, kind);
CREATE INDEX idx_forecasts_expires ON public.analytics_forecasts(expires_at);

ALTER TABLE public.analytics_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own forecasts"
  ON public.analytics_forecasts FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own forecasts"
  ON public.analytics_forecasts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own forecasts"
  ON public.analytics_forecasts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
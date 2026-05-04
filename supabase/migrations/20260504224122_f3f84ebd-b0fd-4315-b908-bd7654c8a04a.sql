
ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_active
  ON public.interview_sessions (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Allow scorecard owner (or admin) to update their AI scorecards (manual edits).
CREATE POLICY "Users update own scorecards"
ON public.interview_scorecards
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_scorecards.session_id
    AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_scorecards.session_id
    AND (s.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
));

-- Auto-update updated_at on scorecards
DROP TRIGGER IF EXISTS trg_interview_scorecards_updated_at ON public.interview_scorecards;
CREATE TRIGGER trg_interview_scorecards_updated_at
BEFORE UPDATE ON public.interview_scorecards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

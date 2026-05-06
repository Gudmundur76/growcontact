-- interview_scorecards: add INSERT + DELETE with ownership check via interview_sessions
CREATE POLICY "Users insert own scorecards"
ON public.interview_scorecards
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_scorecards.session_id
    AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Users delete own scorecards"
ON public.interview_scorecards
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_scorecards.session_id
    AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

-- interview_events: add INSERT + UPDATE + DELETE with ownership check
CREATE POLICY "Users insert own events"
ON public.interview_events
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_events.session_id
    AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Users update own events"
ON public.interview_events
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_events.session_id
    AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

CREATE POLICY "Users delete own events"
ON public.interview_events
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.interview_sessions s
  WHERE s.id = interview_events.session_id
    AND (s.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

-- Lock down internal SECURITY DEFINER email queue helpers to service_role only.
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- Allow service_role to keep using them
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_email(text, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) TO service_role;

-- Interview Copilot tables

CREATE TABLE public.interview_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  candidate_name TEXT NOT NULL,
  role_title TEXT NOT NULL,
  job_description TEXT,
  meeting_url TEXT NOT NULL,
  meeting_platform TEXT NOT NULL CHECK (meeting_platform IN ('zoom','google_meet','microsoft_teams','unknown')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','joining','in_call','completed','failed','cancelled')),
  recall_bot_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_sessions_user ON public.interview_sessions(user_id, created_at DESC);
CREATE INDEX idx_interview_sessions_bot ON public.interview_sessions(recall_bot_id);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.interview_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own sessions" ON public.interview_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.interview_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.interview_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER set_interview_sessions_updated_at
  BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Live event stream: transcript chunks + AI suggestions
CREATE TABLE public.interview_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('transcript','suggestion','red_flag','status')),
  speaker TEXT,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interview_events_session ON public.interview_events(session_id, created_at);

ALTER TABLE public.interview_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view events for own sessions" ON public.interview_events
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.interview_sessions s
            WHERE s.id = session_id AND (s.user_id = auth.uid() OR has_role(auth.uid(),'admin')))
  );

-- Final structured scorecard
CREATE TABLE public.interview_scorecards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  overall_rating INT CHECK (overall_rating BETWEEN 1 AND 5),
  recommendation TEXT CHECK (recommendation IN ('strong_hire','hire','no_hire','strong_no_hire','more_info')),
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  concerns JSONB NOT NULL DEFAULT '[]'::jsonb,
  competencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  follow_ups JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_scorecards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own scorecards" ON public.interview_scorecards
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.interview_sessions s
            WHERE s.id = session_id AND (s.user_id = auth.uid() OR has_role(auth.uid(),'admin')))
  );

CREATE TRIGGER set_interview_scorecards_updated_at
  BEFORE UPDATE ON public.interview_scorecards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live transcript/suggestion streaming
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_sessions;

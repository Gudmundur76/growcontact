
-- Saved searches
CREATE TABLE public.sourcing_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  query TEXT NOT NULL,
  role_title TEXT,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  alert_enabled BOOLEAN NOT NULL DEFAULT false,
  alert_frequency TEXT NOT NULL DEFAULT 'weekly',
  last_run_at TIMESTAMPTZ,
  last_alert_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sourcing_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own searches" ON public.sourcing_searches FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own searches" ON public.sourcing_searches FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own searches" ON public.sourcing_searches FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own searches" ON public.sourcing_searches FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_sourcing_searches_updated BEFORE UPDATE ON public.sourcing_searches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Candidates
CREATE TABLE public.sourcing_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  headline TEXT,
  location TEXT,
  profile_url TEXT NOT NULL,
  avatar_url TEXT,
  email TEXT,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  fit_score INTEGER,
  last_search_id UUID REFERENCES public.sourcing_searches(id) ON DELETE SET NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, source, external_id)
);
CREATE INDEX idx_candidates_user ON public.sourcing_candidates(user_id);
CREATE INDEX idx_candidates_search ON public.sourcing_candidates(last_search_id);
ALTER TABLE public.sourcing_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own candidates" ON public.sourcing_candidates FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own candidates" ON public.sourcing_candidates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own candidates" ON public.sourcing_candidates FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own candidates" ON public.sourcing_candidates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_sourcing_candidates_updated BEFORE UPDATE ON public.sourcing_candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Shortlists
CREATE TABLE public.sourcing_shortlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  role_title TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sourcing_shortlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own shortlists" ON public.sourcing_shortlists FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own shortlists" ON public.sourcing_shortlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own shortlists" ON public.sourcing_shortlists FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own shortlists" ON public.sourcing_shortlists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_sourcing_shortlists_updated BEFORE UPDATE ON public.sourcing_shortlists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sourcing_shortlist_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shortlist_id UUID NOT NULL REFERENCES public.sourcing_shortlists(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.sourcing_candidates(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'new',
  notes TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shortlist_id, candidate_id)
);
ALTER TABLE public.sourcing_shortlist_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own members" ON public.sourcing_shortlist_members FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own members" ON public.sourcing_shortlist_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own members" ON public.sourcing_shortlist_members FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own members" ON public.sourcing_shortlist_members FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_sourcing_members_updated BEFORE UPDATE ON public.sourcing_shortlist_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outreach sequences
CREATE TABLE public.sourcing_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sender_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sourcing_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sequences" ON public.sourcing_sequences FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own sequences" ON public.sourcing_sequences FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sequences" ON public.sourcing_sequences FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sequences" ON public.sourcing_sequences FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_sourcing_sequences_updated BEFORE UPDATE ON public.sourcing_sequences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outreach sends log
CREATE TABLE public.sourcing_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  candidate_id UUID NOT NULL REFERENCES public.sourcing_candidates(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES public.sourcing_sequences(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sends_candidate ON public.sourcing_sends(candidate_id);
ALTER TABLE public.sourcing_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sends" ON public.sourcing_sends FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own sends" ON public.sourcing_sends FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sends" ON public.sourcing_sends FOR DELETE TO authenticated USING (auth.uid() = user_id);

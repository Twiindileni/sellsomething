-- ============================================================
-- Sell Something - Campaign Popups
-- ============================================================

CREATE TABLE IF NOT EXISTS public.campaign_popups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  button_text TEXT,
  link_url TEXT,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.campaign_popups ENABLE ROW LEVEL SECURITY;

-- Anyone can read popups (to check for active ones)
DROP POLICY IF EXISTS "Anyone can read campaign popups" ON public.campaign_popups;
CREATE POLICY "Anyone can read campaign popups" ON public.campaign_popups
  FOR SELECT USING (true);

-- Only admins can modify popups
DROP POLICY IF EXISTS "Admins can insert popups" ON public.campaign_popups;
CREATE POLICY "Admins can insert popups" ON public.campaign_popups
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can update popups" ON public.campaign_popups;
CREATE POLICY "Admins can update popups" ON public.campaign_popups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

DROP POLICY IF EXISTS "Admins can delete popups" ON public.campaign_popups;
CREATE POLICY "Admins can delete popups" ON public.campaign_popups
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = TRUE
    )
  );

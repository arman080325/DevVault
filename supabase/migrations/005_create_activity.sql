-- DevVault Migration: 005_create_activity.sql
-- Activity events for capture, exploration, completion, and milestones

CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('CAPTURED', 'EXPLORED', 'COMPLETED', 'FAVORITED', 'PINNED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_user_created ON public.activity_events(user_id, created_at DESC);

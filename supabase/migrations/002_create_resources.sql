-- DevVault Migration: 002_create_resources.sql
-- Resources table for captured links, articles, repositories, and videos

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  original_url TEXT,
  normalized_url TEXT,
  description TEXT,
  thumbnail_url TEXT,
  source_domain TEXT,
  platform TEXT NOT NULL DEFAULT 'WEBSITE',
  category TEXT NOT NULL DEFAULT 'General',
  status TEXT NOT NULL DEFAULT 'To explore' CHECK (status IN ('To explore', 'Exploring', 'Completed')),
  personal_notes TEXT,
  read_time TEXT,
  author_name TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  explored_at TIMESTAMPTZ,
  CONSTRAINT uq_user_normalized_url UNIQUE (user_id, normalized_url)
);

-- Performance and filter indexes
CREATE INDEX IF NOT EXISTS idx_resources_user_id ON public.resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_status ON public.resources(user_id, status);
CREATE INDEX IF NOT EXISTS idx_resources_user_category ON public.resources(user_id, category);
CREATE INDEX IF NOT EXISTS idx_resources_user_platform ON public.resources(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_resources_user_pinned ON public.resources(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_resources_user_favorite ON public.resources(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(user_id, created_at DESC);

-- Automatic updated_at trigger
CREATE TRIGGER on_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

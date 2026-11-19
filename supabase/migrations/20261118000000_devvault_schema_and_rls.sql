-- ============================================================================
-- DevVault — Complete Supabase PostgreSQL Schema & Row Level Security
-- Version: 1.0.0 (Phase 02 Baseline)
-- Safe to run in Supabase SQL Editor
-- ============================================================================

-- 1. Helper function for automated updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  role_title TEXT DEFAULT 'Personal vault',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Trigger to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, role_title)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role_title', 'Personal vault')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_profiles_updated_at ON public.profiles;
CREATE TRIGGER on_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 3. Resources Table
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

CREATE INDEX IF NOT EXISTS idx_resources_user_id ON public.resources(user_id);
CREATE INDEX IF NOT EXISTS idx_resources_user_status ON public.resources(user_id, status);
CREATE INDEX IF NOT EXISTS idx_resources_user_category ON public.resources(user_id, category);
CREATE INDEX IF NOT EXISTS idx_resources_user_platform ON public.resources(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_resources_user_pinned ON public.resources(user_id, is_pinned);
CREATE INDEX IF NOT EXISTS idx_resources_user_favorite ON public.resources(user_id, is_favorite);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(user_id, created_at DESC);

DROP TRIGGER IF EXISTS on_resources_updated_at ON public.resources;
CREATE TRIGGER on_resources_updated_at
  BEFORE UPDATE ON public.resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Collections Table
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_tone TEXT NOT NULL DEFAULT 'rust' CHECK (cover_tone IN ('rust', 'ink', 'sage', 'sand', 'paper')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_collection_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_collections_user_id ON public.collections(user_id);

DROP TRIGGER IF EXISTS on_collections_updated_at ON public.collections;
CREATE TRIGGER on_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Collection Resources Junction Table
CREATE TABLE IF NOT EXISTS public.collection_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_collection_resource UNIQUE (collection_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_col_res_collection ON public.collection_resources(collection_id);
CREATE INDEX IF NOT EXISTS idx_col_res_resource ON public.collection_resources(resource_id);

-- 6. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_user_tag_name UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- 7. Resource Tags Junction Table
CREATE TABLE IF NOT EXISTS public.resource_tags (
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_res_tags_tag ON public.resource_tags(tag_id);

-- 8. Activity Events Table
CREATE TABLE IF NOT EXISTS public.activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('CAPTURED', 'EXPLORED', 'COMPLETED', 'FAVORITED', 'PINNED')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_user_created ON public.activity_events(user_id, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Resources Policies
DROP POLICY IF EXISTS "Users can view their own resources" ON public.resources;
CREATE POLICY "Users can view their own resources"
  ON public.resources FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own resources" ON public.resources;
CREATE POLICY "Users can insert their own resources"
  ON public.resources FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own resources" ON public.resources;
CREATE POLICY "Users can update their own resources"
  ON public.resources FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own resources" ON public.resources;
CREATE POLICY "Users can delete their own resources"
  ON public.resources FOR DELETE USING (auth.uid() = user_id);

-- Collections Policies
DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own collections" ON public.collections;
CREATE POLICY "Users can insert their own collections"
  ON public.collections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own collections" ON public.collections;
CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collections" ON public.collections;
CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE USING (auth.uid() = user_id);

-- Collection Resources Policies
DROP POLICY IF EXISTS "Users can view collection resources of their own collections" ON public.collection_resources;
CREATE POLICY "Users can view collection resources of their own collections"
  ON public.collection_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_resources.collection_id
      AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add resources to their own collections" ON public.collection_resources;
CREATE POLICY "Users can add resources to their own collections"
  ON public.collection_resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_resources.collection_id
      AND c.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = collection_resources.resource_id
      AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove resources from their own collections" ON public.collection_resources;
CREATE POLICY "Users can remove resources from their own collections"
  ON public.collection_resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_resources.collection_id
      AND c.user_id = auth.uid()
    )
  );

-- Tags Policies
DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tags" ON public.tags;
CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;
CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Resource Tags Policies
DROP POLICY IF EXISTS "Users can view tags on their own resources" ON public.resource_tags;
CREATE POLICY "Users can view tags on their own resources"
  ON public.resource_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_tags.resource_id
      AND r.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can assign tags to their own resources" ON public.resource_tags;
CREATE POLICY "Users can assign tags to their own resources"
  ON public.resource_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_tags.resource_id
      AND r.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.tags t
      WHERE t.id = resource_tags.tag_id
      AND t.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove tags from their own resources" ON public.resource_tags;
CREATE POLICY "Users can remove tags from their own resources"
  ON public.resource_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_tags.resource_id
      AND r.user_id = auth.uid()
    )
  );

-- Activity Events Policies
DROP POLICY IF EXISTS "Users can view their own activity events" ON public.activity_events;
CREATE POLICY "Users can view their own activity events"
  ON public.activity_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity events" ON public.activity_events;
CREATE POLICY "Users can insert their own activity events"
  ON public.activity_events FOR INSERT WITH CHECK (auth.uid() = user_id);

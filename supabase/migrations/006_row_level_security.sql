-- DevVault Migration: 006_row_level_security.sql
-- Enforce Row Level Security (RLS) on all tables for zero data leakage

-- 1. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

-- 2. Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Resources Policies
CREATE POLICY "Users can view their own resources"
  ON public.resources FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own resources"
  ON public.resources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own resources"
  ON public.resources FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own resources"
  ON public.resources FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Collections Policies
CREATE POLICY "Users can view their own collections"
  ON public.collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON public.collections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.collections FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.collections FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Collection Resources Junction Policies (prevent cross-user assignment)
CREATE POLICY "Users can view collection resources of their own collections"
  ON public.collection_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_resources.collection_id
      AND c.user_id = auth.uid()
    )
  );

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

CREATE POLICY "Users can remove resources from their own collections"
  ON public.collection_resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.collections c
      WHERE c.id = collection_resources.collection_id
      AND c.user_id = auth.uid()
    )
  );

-- 6. Tags Policies
CREATE POLICY "Users can view their own tags"
  ON public.tags FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
  ON public.tags FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
  ON public.tags FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Resource Tags Junction Policies
CREATE POLICY "Users can view tags on their own resources"
  ON public.resource_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_tags.resource_id
      AND r.user_id = auth.uid()
    )
  );

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

CREATE POLICY "Users can remove tags from their own resources"
  ON public.resource_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.resources r
      WHERE r.id = resource_tags.resource_id
      AND r.user_id = auth.uid()
    )
  );

-- 8. Activity Events Policies
CREATE POLICY "Users can view their own activity events"
  ON public.activity_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity events"
  ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

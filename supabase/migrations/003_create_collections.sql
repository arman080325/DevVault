-- DevVault Migration: 003_create_collections.sql
-- Curated collections and collection-resource junction

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

CREATE TRIGGER on_collections_updated_at
  BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Junction table supporting many-to-many relationships
CREATE TABLE IF NOT EXISTS public.collection_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_collection_resource UNIQUE (collection_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_col_res_collection ON public.collection_resources(collection_id);
CREATE INDEX IF NOT EXISTS idx_col_res_resource ON public.collection_resources(resource_id);

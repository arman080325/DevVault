-- ============================================================================
-- DevVault Migration: 20261122000000_create_avatars_storage_and_profile_field.sql
-- Feature: User Profile Picture Management & Supabase Storage Integration
--
-- EXECUTION STAGES:
-- Stage 1: Public Database Schema (Run in Supabase SQL Editor)
-- Stage 2: Storage Bucket Creation (Run in Supabase SQL Editor or Dashboard)
-- Stage 3: Storage Object Policies (Run in Supabase Dashboard -> Storage -> Policies
--          or SQL Editor if storage table ownership is granted)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STAGE 1: Public Database Schema Changes
-- Safe to execute in Supabase SQL Editor (owned by postgres / project role)
-- ----------------------------------------------------------------------------

-- 1. Add canonical avatar_path column to public.profiles if not present
-- Note: avatar_url already exists in the initial schema (001_create_profiles.sql).
-- avatar_path stores the relative storage object path (e.g., '<user_id>/avatar-<id>.webp')
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_path TEXT NULL;

-- 2. Ensure updated handle_new_user trigger preserves avatar metadata safely
-- Sets explicit search_path = public to protect against search_path hijacking in SECURITY DEFINER
-- Preserves existing user-uploaded avatar_url and avatar_path on OAuth conflict
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, avatar_path, role_title)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'avatar_path',
    COALESCE(NEW.raw_user_meta_data->>'role_title', 'Personal vault')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    avatar_url = COALESCE(public.profiles.avatar_url, EXCLUDED.avatar_url),
    avatar_path = COALESCE(public.profiles.avatar_path, EXCLUDED.avatar_path),
    updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;


-- ----------------------------------------------------------------------------
-- STAGE 2: Storage Bucket Configuration
-- Inserts/updates the 'avatars' bucket metadata in storage.buckets.
-- (Can also be created via Supabase Dashboard -> Storage -> New Bucket)
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];


-- ----------------------------------------------------------------------------
-- STAGE 3: Storage Object Row Level Security Policies
-- NOTE: In Supabase, storage.objects is owned by the system role supabase_storage_admin.
-- In PostgreSQL, CREATE POLICY and DROP POLICY require table ownership.
-- If running this in SQL Editor fails with "ERROR 42501: must be owner of table objects",
-- create these 4 policies directly in the Supabase Dashboard:
-- Storage -> Policies -> avatars bucket -> "New policy"
-- ----------------------------------------------------------------------------

-- Policy 1: SELECT (Public Read)
DROP POLICY IF EXISTS "Public avatars can be viewed by anyone" ON storage.objects;
CREATE POLICY "Public avatars can be viewed by anyone"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Policy 2: INSERT (Authenticated Users Only into their own UUID folder)
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 3: UPDATE (Authenticated Owners Only)
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy 4: DELETE (Authenticated Owners Only)
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

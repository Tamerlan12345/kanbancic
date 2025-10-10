-- File: supabase/migrations/006_add_created_by_to_projects.sql

-- Add the created_by column to the projects table, with the default value
-- set to the ID of the currently authenticated user. This ensures that the
-- database, not the client, is the source of truth for project ownership.
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid();

COMMENT ON COLUMN public.projects.created_by IS 'Автор проекта';
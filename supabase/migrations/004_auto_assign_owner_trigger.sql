-- Migration: 004_auto_assign_owner_trigger.sql
-- Description: This migration creates a trigger to automatically assign the
-- authenticated user as the 'Owner' in the project_members table when they create a new project.

-- 1. Create the function that will be triggered.
-- This function inserts a new row into project_members, linking the new project's ID
-- with the currently authenticated user's ID and assigning them the 'Owner' role.
CREATE OR REPLACE FUNCTION public.assign_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator of the project as the owner into the project_members table.
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'Owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER is important here as it allows the function to run with the permissions
-- of the user who defined it, bypassing potential RLS policies that might block the insert.

-- 2. Create the trigger that calls the function.
-- This trigger will fire AFTER a new row is inserted into the 'projects' table.
-- It runs for each new row.
DROP TRIGGER IF EXISTS on_project_created_assign_owner ON public.projects; -- Drop if it exists to ensure idempotency
CREATE TRIGGER on_project_created_assign_owner
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.assign_project_owner();

COMMENT ON FUNCTION public.assign_project_owner IS 'Trigger function to automatically make the project creator an owner.';
COMMENT ON TRIGGER on_project_created_assign_owner ON public.projects IS 'After a project is created, this trigger assigns the creator as the project owner.';
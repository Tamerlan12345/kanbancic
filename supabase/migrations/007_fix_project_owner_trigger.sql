-- Migration: 007_fix_project_owner_trigger.sql
-- Description: This migration updates the assign_project_owner function to fix a bug
-- where the user_id was being inserted as NULL. The function now sources the user ID
-- from the `created_by` column of the new project row.

-- 1. Re-create the function with the corrected logic.
-- This function now inserts a new row into project_members using the `created_by`
-- field from the newly inserted project, which is correctly populated by a DEFAULT.
CREATE OR REPLACE FUNCTION public.assign_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert the creator of the project as the owner into the project_members table.
  -- The user ID is now sourced from NEW.created_by instead of auth.uid(), which
  -- was NULL in the trigger's security context.
  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'Owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.assign_project_owner IS 'Trigger function to automatically make the project creator an owner. Corrected to use NEW.created_by.';
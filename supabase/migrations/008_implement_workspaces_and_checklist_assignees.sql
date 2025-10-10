-- Migration: 008_implement_workspaces_and_checklist_assignees.sql
-- Description: This migration introduces workspace types and checklist assignees, and corrects FK references to point to `public.profiles`.
-- It adds the necessary columns and updates RLS policies accordingly.
-- This script is designed to be idempotent.

BEGIN;

-- 1. Create a new ENUM type for workspace types.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_type_enum') THEN
        CREATE TYPE workspace_type_enum AS ENUM ('Personal', 'Corporate');
    END IF;
END$$;

-- 2. Alter the `workspaces` table to add type and owner.
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS workspace_type workspace_type_enum NOT NULL DEFAULT 'Personal',
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.workspaces.workspace_type IS 'Defines if the workspace is Personal or Corporate.';
COMMENT ON COLUMN public.workspaces.owner_id IS 'The user who owns the workspace, particularly for Corporate workspaces.';

-- 3. Alter the `task_checklists` table to add assignee.
ALTER TABLE public.task_checklists
ADD COLUMN IF NOT EXISTS assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.task_checklists.assignee_id IS 'The user assigned to complete the checklist item.';

-- 4. RLS Policies and Triggers for Workspaces

-- 4.1. Create a function to automatically create a personal workspace for new users.
CREATE OR REPLACE FUNCTION public.handle_new_user_personal_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a personal workspace for the new user and set them as the owner.
  INSERT INTO public.workspaces(name, owner_id, workspace_type)
  VALUES ('Personal', NEW.id, 'Personal');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2. Create a trigger on the `auth.users` table to execute the function upon user creation.
DROP TRIGGER IF EXISTS on_auth_user_created_create_personal_workspace ON auth.users;
CREATE TRIGGER on_auth_user_created_create_personal_workspace
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_personal_workspace();

-- 4.3. Enable RLS on the workspaces table.
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- 4.4. Define RLS policy for selecting workspaces.
DROP POLICY IF EXISTS "Allow read access to user's workspaces" ON public.workspaces;
CREATE POLICY "Allow read access to user's workspaces" ON public.workspaces
FOR SELECT USING (
  (workspace_type = 'Personal' AND owner_id = auth.uid()) OR
  (workspace_type = 'Corporate' AND id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  ))
);

-- 4.5. Define RLS policy for creating workspaces.
DROP POLICY IF EXISTS "Allow users to create corporate workspaces" ON public.workspaces;
CREATE POLICY "Allow users to create corporate workspaces" ON public.workspaces
FOR INSERT WITH CHECK (
  workspace_type = 'Corporate' AND owner_id = auth.uid()
);

-- 5. RLS Policies for Task Checklist Assignments

-- 5.1. Drop the existing broad policy on task_checklists.
DROP POLICY IF EXISTS "Allow access based on parent task" ON public.task_checklists;

-- 5.2. Create SELECT policy for project members.
CREATE POLICY "Allow read access to project members" ON public.task_checklists
FOR SELECT USING (
  (SELECT is_project_member(project_id, auth.uid()) FROM tasks WHERE tasks.id = task_checklists.task_id)
);

-- 5.3. Create INSERT policy for project members.
CREATE POLICY "Allow insert for project members" ON public.task_checklists
FOR INSERT WITH CHECK (
  (SELECT is_project_member(project_id, auth.uid()) FROM tasks WHERE tasks.id = task_checklists.task_id)
);

-- 5.4. Create DELETE policy for project members.
CREATE POLICY "Allow delete for project members" ON public.task_checklists
FOR DELETE USING (
  (SELECT is_project_member(project_id, auth.uid()) FROM tasks WHERE tasks.id = task_checklists.task_id)
);

-- 5.5. Create a corrected UPDATE policy that checks roles for assigning users.
-- This is the corrected policy.
DROP POLICY IF EXISTS "Allow update for members with role check for assignment" ON public.task_checklists;
CREATE POLICY "Allow update for members with role check for assignment" ON public.task_checklists
FOR UPDATE USING (
  (SELECT is_project_member(project_id, auth.uid()) FROM tasks WHERE tasks.id = task_checklists.task_id)
) WITH CHECK (
  (
    -- If the assignee is not being changed, any project member can update the item (e.g., check it off).
    (SELECT t.assignee_id FROM task_checklists t WHERE t.id = id) IS NOT DISTINCT FROM assignee_id
  ) OR (
    -- If the assignee is being changed, the user must have a manager-level role.
    (SELECT t.assignee_id FROM task_checklists t WHERE t.id = id) IS DISTINCT FROM assignee_id AND
    (
      (SELECT get_my_project_role(tasks.project_id) FROM tasks WHERE tasks.id = task_checklists.task_id)
        IN ('Owner', 'Admin', 'Project Manager', 'Team Lead')
    )
  )
);

COMMIT;

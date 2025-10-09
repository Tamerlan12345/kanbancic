-- Migration: 005_fix_task_creation_policy.sql
-- Description: This migration updates the RLS policy for task creation to be more direct and robust.
-- It replaces the role-based check with a direct membership check, which is less prone to
-- race conditions immediately after a project is created and the ownership trigger fires.

BEGIN;

-- Drop the existing, more complex policy
DROP POLICY IF EXISTS "Allow task creation for project members" ON tasks;

-- Create a new, simpler policy for task creation.
-- This policy directly checks if the user is a member of the project using the
-- existing `is_project_member` helper function. This is cleaner and more reliable.
CREATE POLICY "Allow task creation for project members" ON tasks
FOR INSERT WITH CHECK (is_project_member(project_id, auth.uid()));

COMMIT;
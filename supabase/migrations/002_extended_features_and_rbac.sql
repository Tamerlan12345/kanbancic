-- Migration: 002_extended_features_and_rbac.sql
-- Description: This migration introduces new tables for project-level roles, task checklists, and AI conversations.
-- It also adds time tracking fields to tasks and implements comprehensive Row-Level Security (RLS) policies.

-- This script is designed to be idempotent and can be re-run safely.

BEGIN;

-- 1. Create a new table for project-level members and roles.
CREATE TABLE IF NOT EXISTS project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'Member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);
COMMENT ON TABLE project_members IS 'Manages user roles within specific projects.';

-- 2. Add new columns to the `tasks` table for deadlines and time tracking.
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS estimated_time INTERVAL,
ADD COLUMN IF NOT EXISTS logged_time INTERVAL;

-- 3. Create a new table for task checklists.
CREATE TABLE IF NOT EXISTS task_checklists (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL
);
COMMENT ON TABLE task_checklists IS 'Stores checklist items for tasks to allow for sub-task management.';

-- 4. Create a new table for storing AI assistant conversations.
CREATE TABLE IF NOT EXISTS task_ai_conversations (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE task_ai_conversations IS 'Stores the history of interactions with the AI assistant for each task.';

-- 5. Helper functions for RLS policies.
CREATE OR REPLACE FUNCTION get_my_project_role(p_project_id UUID)
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
    LIMIT 1;
    RETURN v_role;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_project_member(p_project_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM project_members pm
        WHERE pm.project_id = p_project_id AND pm.user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION is_project_member(UUID, UUID) IS 'Checks if a user is a member of a given project.';

-- 6. Enable RLS on all relevant tables.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_ai_conversations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for `projects`
DROP POLICY IF EXISTS "Allow read access to project members" ON projects;
CREATE POLICY "Allow read access to project members" ON projects
FOR SELECT USING (is_project_member(id, auth.uid()));

-- 8. RLS Policies for `project_members`
DROP POLICY IF EXISTS "Allow read access to fellow project members" ON project_members;
CREATE POLICY "Allow read access to fellow project members" ON project_members
FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Allow management by project admins" ON project_members;
CREATE POLICY "Allow management by project admins" ON project_members
FOR INSERT, UPDATE, DELETE USING (get_my_project_role(project_id) IN ('Owner', 'Admin'));

-- 9. RLS Policies for `tasks`
DROP POLICY IF EXISTS "Allow read access to project members" ON tasks;
CREATE POLICY "Allow read access to project members" ON tasks
FOR SELECT USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Allow task creation for project members" ON tasks;
CREATE POLICY "Allow task creation for project members" ON tasks
FOR INSERT WITH CHECK (get_my_project_role(project_id) IN ('Owner', 'Admin', 'Project Manager', 'Team Lead', 'Member'));

-- Simplified UPDATE policy to prevent drag-and-drop errors
DROP POLICY IF EXISTS "Allow task updates based on role" ON tasks;
CREATE POLICY "Allow task updates based on role" ON tasks
FOR UPDATE USING (is_project_member(project_id, auth.uid()));

DROP POLICY IF EXISTS "Allow task deletion for project admins" ON tasks;
CREATE POLICY "Allow task deletion for project admins" ON tasks
FOR DELETE USING (get_my_project_role(project_id) IN ('Owner', 'Admin', 'Project Manager'));

-- 10. RLS Policies for `task_checklists` and `task_ai_conversations`
DROP POLICY IF EXISTS "Allow access based on parent task" ON task_checklists;
CREATE POLICY "Allow access based on parent task" ON task_checklists
FOR ALL USING ((SELECT is_project_member(project_id, auth.uid()) FROM tasks WHERE tasks.id = task_checklists.task_id));

DROP POLICY IF EXISTS "Allow access based on parent task" ON task_ai_conversations;
CREATE POLICY "Allow access based on parent task" ON task_ai_conversations
FOR ALL USING ((SELECT is_project_member(project_id, auth.uid()) FROM tasks WHERE tasks.id = task_ai_conversations.task_id));

COMMIT;
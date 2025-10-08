-- Migration: 002_extended_features_and_rbac.sql
-- Description: This migration introduces new tables for project-level roles, task checklists, and AI conversations.
-- It also adds time tracking fields to tasks and implements comprehensive Row-Level Security (RLS) policies.

-- This script is designed to be idempotent and can be re-run safely.

BEGIN;

-- 1. Create a new table for project-level members and roles.
-- This is crucial for the new RBAC model at the project scope.
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
ADD COLUMN IF NOT EXISTS estimated_time INTERVAL, -- e.g., '2 hours', '3 days'
ADD COLUMN IF NOT EXISTS logged_time INTERVAL; -- e.g., '1 hour 30 minutes'

COMMENT ON COLUMN tasks.deadline IS 'The due date and time for the task.';
COMMENT ON COLUMN tasks.estimated_time IS 'The planned time estimate to complete the task.';
COMMENT ON COLUMN tasks.logged_time IS 'The actual time spent on the task.';

-- 3. Create a new table for task checklists.
-- This allows for creating multiple sub-items within a single task.
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
-- Each task will have its own conversation history with the AI.
CREATE TABLE IF NOT EXISTS task_ai_conversations (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- The user who prompted the AI
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
COMMENT ON TABLE task_ai_conversations IS 'Stores the history of interactions with the AI assistant for each task.';

-- 5. Helper functions for RLS policies.

-- Gets the user's role in a specific project.
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
COMMENT ON FUNCTION get_my_project_role(UUID) IS 'Returns the role of the currently authenticated user for a given project.';

-- Checks if two users are in any of the same teams.
CREATE OR REPLACE FUNCTION is_in_same_team(user1_id UUID, user2_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM team_members tm1
        JOIN team_members tm2 ON tm1.team_id = tm2.team_id
        WHERE tm1.user_id = user1_id AND tm2.user_id = user2_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
COMMENT ON FUNCTION is_in_same_team(UUID, UUID) IS 'Checks if two users share at least one team.';

-- 6. Enable RLS on all relevant tables.
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_ai_conversations ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for `projects`
-- Users can only see projects they are a member of.
DROP POLICY IF EXISTS "Allow read access to project members" ON projects;
CREATE POLICY "Allow read access to project members" ON projects
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid()
    )
);

-- 8. RLS Policies for `project_members`
-- Users can see other members of projects they belong to.
DROP POLICY IF EXISTS "Allow read access to fellow project members" ON project_members;
CREATE POLICY "Allow read access to fellow project members" ON project_members
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM project_members AS pm
        WHERE pm.project_id = project_members.project_id AND pm.user_id = auth.uid()
    )
);
-- Only admins/owners can add, update, or remove project members.
DROP POLICY IF EXISTS "Allow management by project admins" ON project_members;
CREATE POLICY "Allow management by project admins" ON project_members
FOR ALL USING (
    get_my_project_role(project_id) IN ('Owner', 'Admin')
);

-- 9. RLS Policies for `tasks`
-- Users can see all tasks in projects they are a member of.
DROP POLICY IF EXISTS "Allow read access to project members" ON tasks;
CREATE POLICY "Allow read access to project members" ON tasks
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = tasks.project_id AND project_members.user_id = auth.uid()
    )
);

-- Users can create tasks if their role is Member or higher.
DROP POLICY IF EXISTS "Allow task creation for project members" ON tasks;
CREATE POLICY "Allow task creation for project members" ON tasks
FOR INSERT WITH CHECK (
    get_my_project_role(project_id) IN ('Owner', 'Admin', 'Project Manager', 'Team Lead', 'Member')
);

-- Users can update tasks based on their role.
DROP POLICY IF EXISTS "Allow task updates based on role" ON tasks;
CREATE POLICY "Allow task updates based on role" ON tasks
FOR UPDATE USING (
    ( -- Admins and Project Managers can edit any task
        get_my_project_role(project_id) IN ('Owner', 'Admin', 'Project Manager')
    ) OR
    ( -- Team Leads can edit tasks assigned to members of their team.
        get_my_project_role(project_id) = 'Team Lead' AND is_in_same_team(auth.uid(), assignee_id)
    ) OR
    ( -- Members can edit tasks they are assigned to.
        get_my_project_role(project_id) = 'Member' AND (assignee_id = auth.uid())
    )
);

-- Only Admins and Project Managers can delete tasks.
DROP POLICY IF EXISTS "Allow task deletion for project admins" ON tasks;
CREATE POLICY "Allow task deletion for project admins" ON tasks
FOR DELETE USING (
    get_my_project_role(project_id) IN ('Owner', 'Admin', 'Project Manager')
);

-- 10. RLS Policies for `task_checklists` and `task_ai_conversations`
-- Access is granted if the user has SELECT access to the parent task.
-- Note: The check is implicitly handled by Postgres RLS. When this policy's subquery
-- reads from the `tasks` table, the RLS policies on `tasks` are automatically applied.
-- So, this policy will only pass if the user has read access to the parent task.
DROP POLICY IF EXISTS "Allow access based on parent task" ON task_checklists;
CREATE POLICY "Allow access based on parent task" ON task_checklists
FOR ALL USING (
    (SELECT TRUE FROM tasks WHERE tasks.id = task_checklists.task_id)
);

DROP POLICY IF EXISTS "Allow access based on parent task" ON task_ai_conversations;
CREATE POLICY "Allow access based on parent task" ON task_ai_conversations
FOR ALL USING (
    (SELECT TRUE FROM tasks WHERE tasks.id = task_ai_conversations.task_id)
);

COMMIT;
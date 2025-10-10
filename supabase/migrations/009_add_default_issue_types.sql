-- Migration: 009_add_default_issue_types.sql
-- Description: This migration adds a trigger to automatically populate new projects
-- with a default set of issue types, improving the user onboarding experience.

BEGIN;

-- 1. Create the function that will be triggered.
-- This function inserts a standard set of issue types for the newly created project.
CREATE OR REPLACE FUNCTION public.populate_default_issue_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a predefined list of issue types associated with the new project's ID.
  INSERT INTO public.issue_types (project_id, name, color)
  VALUES
    (NEW.id, 'Задача', '#4BADE8'),  -- Blue for standard tasks
    (NEW.id, 'История', '#65A565'), -- Green for user stories
    (NEW.id, 'Ошибка', '#E84B4B'),   -- Red for bugs
    (NEW.id, 'Эпик', '#9B59B6');    -- Purple for epics

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.populate_default_issue_types() IS 'Automatically adds default issue types (Task, Story, Bug, Epic) to new projects.';

-- 2. Create the trigger that calls the function after a project is created.
-- This trigger fires AFTER a new row is inserted into the 'projects' table.
DROP TRIGGER IF EXISTS on_project_created_populate_defaults ON public.projects;
CREATE TRIGGER on_project_created_populate_defaults
  AFTER INSERT ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.populate_default_issue_types();

COMMENT ON TRIGGER on_project_created_populate_defaults ON public.projects IS 'After project creation, populates it with default issue types.';

COMMIT;
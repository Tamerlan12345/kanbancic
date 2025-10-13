-- Migration: 010_backfill_issue_types.sql
-- Description: This migration backfills default issue types for all existing projects
-- to ensure data consistency for projects created before the trigger was introduced.

BEGIN;

-- Backfill default issue types for all existing projects.
-- This script ensures that projects created before migration 009 also get the default issue types.
DO $$
DECLARE
    proj_id UUID;
BEGIN
    RAISE NOTICE 'Starting to backfill default issue types for existing projects...';
    -- Loop through all projects that do not have any issue types yet.
    FOR proj_id IN
        SELECT p.id
        FROM public.projects p
        WHERE NOT EXISTS (SELECT 1 FROM public.issue_types WHERE project_id = p.id)
    LOOP
        RAISE NOTICE 'Adding default issue types for project %', proj_id;
        -- Insert the default set of issue types for the project.
        INSERT INTO public.issue_types (project_id, name, color)
        VALUES
            (proj_id, 'Задача', '#4BADE8'),
            (proj_id, 'История', '#65A565'),
            (proj_id, 'Ошибка', '#E84B4B'),
            (proj_id, 'Эпик', '#9B59B6');
    END LOOP;
    RAISE NOTICE 'Backfill complete.';
END $$;

COMMIT;
-- Migration: 003_notifications_and_triggers.sql
-- Description: This migration sets up a database trigger to send a notification
-- when a user is assigned to a task.

BEGIN;

-- 1. Create a function to handle the trigger logic.
CREATE OR REPLACE FUNCTION handle_task_assignee_change()
RETURNS TRIGGER AS $$
DECLARE
  -- Variables to hold the necessary data for the notification.
  assignee_email TEXT;
  assignee_name TEXT;
  task_title TEXT;
  project_name TEXT;
  project_id_text TEXT;
BEGIN
  -- Proceed only if the assignee_id has been updated and is not null.
  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id AND NEW.assignee_id IS NOT NULL THEN

    -- Get the necessary details for the notification email.
    SELECT p.email, p.full_name INTO assignee_email, assignee_name
    FROM profiles p WHERE p.id = NEW.assignee_id;

    SELECT t.title INTO task_title
    FROM tasks t WHERE t.id = NEW.id;

    SELECT pr.name, pr.id::text INTO project_name, project_id_text
    FROM projects pr WHERE pr.id = NEW.project_id;

    -- Asynchronously invoke the Edge Function to send the email.
    -- This prevents blocking the database transaction.
    PERFORM net.http_post(
        -- The URL of the Edge Function to invoke.
        url:=(SELECT uri FROM supabase_functions.secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/send-assignment-notification',
        -- The body of the request, containing the notification payload.
        body:=jsonb_build_object(
            'assignee_email', assignee_email,
            'assignee_name', assignee_name,
            'task_title', task_title,
            'task_id', NEW.id,
            'project_name', project_name,
            'project_id', project_id_text
        ),
        -- The headers for the request, including the service role key for authorization.
        headers:=jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT secret FROM supabase_functions.secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
        )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on the 'tasks' table.
DROP TRIGGER IF EXISTS on_task_assignee_change ON tasks;
CREATE TRIGGER on_task_assignee_change
  AFTER UPDATE OF assignee_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_assignee_change();

COMMIT;
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from Vite's environment variables.
// See .env.example for more details.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create and export the Supabase client instance.
// If the credentials are not available or are placeholders, this will be null.
export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('YOUR_SUPABASE'))
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Log a warning if the client could not be initialized.
if (!supabase) {
    console.warn("Supabase client not initialized. Please create a .env.local file with your credentials (see .env.example). The application will run in offline mode.");
}

/**
 * Fetches all tasks for a specified project.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<Array>} - An array of task objects.
 */
export async function getTasks(projectId) {
    if (!supabase) {
        console.log("Offline mode: cannot fetch tasks.");
        return [];
    }

    const { data, error } = await supabase
        .from('tasks')
        .select(`
            *,
            assignee:profiles!assignee_id (avatar_url),
            issue_type:issue_types (name, color)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }

    return data;
}

/**
 * Creates a new task in the database.
 * @param {Object} taskData - The data for the new task (name, description, status, etc.).
 * @param {string} projectId - The ID of the project this task belongs to.
 * @returns {Promise<Object|null>} - The newly created task object or null on error.
 */
export async function createTask(taskData, projectId) {
    if (!supabase) {
        console.log("Offline mode: cannot create task.");
        return null;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("User not authenticated. Cannot create task.");
        return null;
    }

    const taskToInsert = {
        ...taskData,
        project_id: projectId,
        reporter_id: user.id,
    };

    const { data, error } = await supabase
        .from('tasks')
        .insert(taskToInsert)
        .select()
        .single();

    if (error) {
        console.error('Error creating task:', error);
        return null;
    }

    return data;
}

/**
 * Fetches all projects that the current user is a member of.
 * @returns {Promise<Array>} - An array of project objects.
 */
export async function getProjectsForUser() {
  if (!supabase) {
    console.log("Offline mode: cannot fetch projects.");
    return [];
  }

  // Get the current user's ID
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return [];
  }

  // Step 1: Find all workspace_ids the user is a member of.
  const { data: memberOf, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id);

  if (memberError) {
    console.error('Error fetching user workspaces:', memberError);
    return [];
  }

  if (!memberOf || memberOf.length === 0) {
    return []; // User is not a member of any workspace
  }

  const workspaceIds = memberOf.map(wm => wm.workspace_id);

  // Step 2: Use those workspace IDs to find all projects.
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      workspace:workspaces ( name )
    `)
    .in('workspace_id', workspaceIds);

  if (error) {
    console.error('Error fetching user projects:', error);
    return [];
  }

  return data;
}

/**
 * Checks if a project with the given ID exists.
 * @param {string} projectId - The ID of the project to check.
 * @returns {Promise<boolean>} - True if the project exists, false otherwise.
 */
export async function checkProjectExists(projectId) {
    if (!supabase) {
        console.log("Offline mode: cannot check project existence.");
        // In offline mode, assume it exists to avoid blocking UI.
        // The task fetch will return empty anyway.
        return true;
    }

    const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();

    // .single() throws an error if no row is found (PGRST116), which is expected.
    // We only care about other, unexpected errors.
    if (error && error.code !== 'PGRST116') {
        console.error('Error checking project existence:', error);
        return false; // On unexpected error, assume it doesn't exist.
    }

    // If data is not null, the project exists.
    return !!data;
}

/**
 * Updates the status of a task.
 * @param {string} taskId - The ID of the task to update.
 * @param {string} newStatus - The new status of the task.
 * @returns {Promise<Object|null>} - The updated task data or null in case of an error.
 */
export async function updateTaskStatus(taskId, newStatus) {
    if (!supabase) {
        console.log("Offline mode: cannot update task status.");
        return null;
    }

    const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error updating task status:', error);
        return null;
    }

    return data;
}
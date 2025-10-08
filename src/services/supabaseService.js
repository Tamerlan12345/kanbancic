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
            assignee:profiles (avatar_url),
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
 * Fetches a single task by its ID.
 * @param {string} taskId - The ID of the task to fetch.
 * @returns {Promise<Object|null>} The task object or null on error.
 */
export async function getTaskById(taskId) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

    if (error) {
        console.error(`Error fetching task ${taskId}:`, error);
        return null;
    }

    return data;
}

/**
 * Updates a task with new data.
 * @param {string} taskId - The ID of the task to update.
 * @param {Object} updates - An object containing the fields to update.
 * @returns {Promise<Object|null>} The updated task object or null on error.
 */
export async function updateTask(taskId, updates) {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();

    if (error) {
        console.error('Error updating task:', error);
        return null;
    }

    return data;
}

// --- Checklist Functions ---

/**
 * Fetches all checklist items for a specific task.
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<Array>} - An array of checklist item objects.
 */
export async function getChecklistForTask(taskId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('task_checklists')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) console.error('Error fetching checklist:', error);
  return data || [];
}

/**
 * Adds a new item to a task's checklist.
 * @param {string} taskId - The ID of the task.
 * @param {string} title - The content of the checklist item.
 * @returns {Promise<Object|null>} - The newly created checklist item.
 */
export async function addChecklistItem(taskId, title) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('task_checklists')
    .insert({ task_id: taskId, title: title, created_by_user_id: user.id })
    .select()
    .single();
  if (error) console.error('Error adding checklist item:', error);
  return data;
}

/**
 * Updates an existing checklist item.
 * @param {number} itemId - The ID of the checklist item.
 * @param {Object} updates - An object with the fields to update (e.g., { title, is_completed }).
 * @returns {Promise<Object|null>} - The updated checklist item.
 */
export async function updateChecklistItem(itemId, updates) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('task_checklists')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();
  if (error) console.error('Error updating checklist item:', error);
  return data;
}

/**
 * Deletes a checklist item.
 * @param {number} itemId - The ID of the checklist item to delete.
 * @returns {Promise<boolean>} - True if deletion was successful.
 */
export async function deleteChecklistItem(itemId) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('task_checklists')
    .delete()
    .eq('id', itemId);
  if (error) {
    console.error('Error deleting checklist item:', error);
    return false;
  }
  return true;
}

// --- AI Assistant Functions ---

/**
 * Invokes the 'gemini-proxy' Edge Function to get a response from the AI.
 * @param {string} prompt - The user's prompt to send to the AI.
 * @returns {Promise<string|null>} - The AI's response text or null on error.
 */
export async function invokeGeminiProxy(prompt) {
  if (!supabase) return null;
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { prompt },
  });
  if (error) {
    console.error('Error invoking Gemini proxy:', error);
    return null;
  }
  return data?.response;
}

/**
 * Fetches the AI conversation history for a specific task.
 * @param {string} taskId - The ID of the task.
 * @returns {Promise<Array>} - An array of conversation objects.
 */
export async function getAiConversationHistory(taskId) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('task_ai_conversations')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at');
  if (error) console.error('Error fetching AI conversation history:', error);
  return data || [];
}

/**
 * Saves a new entry to the AI conversation history.
 * @param {string} taskId - The ID of the task.
 * @param {string} prompt - The user's prompt.
 * @param {string} response - The AI's response.
 * @returns {Promise<Object|null>} - The saved conversation object.
 */
export async function saveAiConversation(taskId, prompt, response) {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('task_ai_conversations')
    .insert({
      task_id: taskId,
      user_id: user.id,
      prompt,
      response,
    })
    .select()
    .single();
  if (error) console.error('Error saving AI conversation:', error);
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
        author_id: user.id,
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
 * With RLS enabled on the `projects` table, we can query it directly.
 * The policy will ensure that only projects the user is a member of are returned.
 * @returns {Promise<Array>} - An array of project objects.
 */
export async function getProjectsForUser() {
  if (!supabase) {
    console.log("Offline mode: cannot fetch projects.");
    return [];
  }

  // RLS on the 'projects' table automatically filters for projects
  // where the user is a member of 'project_members'.
  const { data, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      description,
      workspace:workspaces ( name )
    `);

  if (error) {
    console.error('Error fetching user projects:', error);
    // If RLS prevents access, the error might be intentional.
    // We'll log it but return an empty array to the UI.
    return [];
  }

  return data;
}

/**
 * Fetches project details for a given project ID.
 * @param {string} projectId - The ID of the project to fetch details for.
 * @returns {Promise<Object|null>} - The project details or null on error.
 */
export async function getProjectDetails(projectId) {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();
    if (error) {
        console.error('Error fetching project details:', error);
        return null;
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
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from Vite's environment variables.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create and export the Supabase client instance.
export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('YOUR_SUPABASE'))
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (!supabase) {
    console.warn("Supabase client not initialized. Please create a .env.local file with your credentials (see .env.example). The application will run in offline mode.");
}

/**
 * Fetches all tasks for a specified project.
 */
export async function getTasks(projectId) {
    if (!supabase) return [];
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
 * Fetches a single task by its ID.
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

/**
 * Updates the status of a task.
 */
export async function updateTaskStatus(taskId, newStatus) {
    if (!supabase) return null;
    const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
    if (error) {
        console.error('Error updating task status:', error);
        return null;
    }
    return { id: taskId, status: newStatus };
}

/**
 * Fetches all available issue types for a project.
 */
export async function getIssueTypes(projectId) {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('issue_types')
        .select('id, name')
        .eq('project_id', projectId);
    if (error) {
        console.error('Error fetching issue types:', error);
        return [];
    }
    return data;
}

/**
 * Creates a new task in the database.
 */
export async function createTask(taskData, projectId) {
    if (!supabase) return null;
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

// --- Checklist Functions ---
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

// --- Project Functions ---
export async function getProjectsForUser() {
  if (!supabase) return [];
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
    return [];
  }
  return data;
}

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

export async function checkProjectExists(projectId) {
    if (!supabase) return true;
    const { data, error } = await supabase
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .single();
    if (error && error.code !== 'PGRST116') {
        console.error('Error checking project existence:', error);
        return false;
    }
    return !!data;
}
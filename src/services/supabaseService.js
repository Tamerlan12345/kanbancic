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
 * Fetches the role of the current user for a specific project.
 * @param {string} projectId - The ID of the project.
 */
export async function getMyProjectRole(projectId) {
    if (!supabase) return { data: null, error: new Error('Supabase client not initialized') };
    const { data, error } = await supabase.rpc('get_my_project_role', { p_project_id: projectId });
    if (error) {
        console.error('Error fetching user project role:', error);
        return { data: null, error };
    }
    return { data, error: null };
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
        .select(); // <-- Removed .single()

    if (error) {
        console.error('Error updating task:', error);
        return null;
    }
    // Return the first record from the array, or null if the array is empty
    return data?.[0] || null;
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

/**
 * Creates multiple sub-tasks for a given parent task.
 * @param {string} parentId - The ID of the parent task.
 * @param {Array<{title: string}>} tasks - An array of objects, each with a title for the new sub-task.
 * @returns {Promise<Array|null>} - A promise that resolves to an array of the created sub-tasks.
 */
export async function createSubTasks(parentId, tasks) {
    if (!supabase) return null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.error("User not authenticated. Cannot create sub-tasks.");
        return null;
    }

    // Fetch the parent task to get essential details like project_id
    const { data: parentTask, error: parentError } = await supabase
        .from('tasks')
        .select('project_id, issue_type_id')
        .eq('id', parentId)
        .single();

    if (parentError || !parentTask) {
        console.error('Error fetching parent task for sub-task creation:', parentError);
        return null;
    }

    const subTasksToInsert = tasks.map(task => ({
        title: task.title,
        parent_id: parentId,
        project_id: parentTask.project_id,
        reporter_id: user.id,
        status: 'To Do', // Default status for new sub-tasks
        issue_type_id: parentTask.issue_type_id, // Inherit issue type from parent
    }));

    const { data, error } = await supabase
        .from('tasks')
        .insert(subTasksToInsert)
        .select();

    if (error) {
        console.error('Error creating sub-tasks:', error);
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

/**
 * Adds multiple checklist items in a single request.
 * @param {Array<Object>} items - An array of checklist item objects to insert.
 * Each object should have `task_id`, `title`, and `is_completed`.
 */
export async function addChecklistItemsBatch(items) {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Add user ID to each item
    const itemsToInsert = items.map(item => ({
        ...item,
        created_by_user_id: user.id,
    }));

    const { data, error } = await supabase
        .from('task_checklists')
        .insert(itemsToInsert)
        .select();

    if (error) {
        console.error('Error batch adding checklist items:', error);
        return null;
    }
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
  // The function now returns the entire structured JSON object from the backend.
  return data;
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

// --- Project & Team Management Functions ---

/**
 * Fetches all workspaces available to the user.
 * Note: Assumes a simple setup where all workspaces are public.
 * Adjust RLS policies if workspaces become private.
 */
export async function getWorkspaces() {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('workspaces')
        .select('id, name');

    if (error) {
        console.error('Error fetching workspaces:', error);
        return [];
    }
    return data;
}

/**
 * Creates a new project by invoking an edge function.
 * @param {{ name: string, description: string, workspace_id: string }} projectData - The project data.
 */
export async function createProject(projectData) {
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('create-project', {
        body: projectData,
    });
    if (error) {
        console.error('Error creating project:', error);
        return { error };
    }
    return { data };
}


/**
 * Fetches projects for the currently authenticated user.
 * This function is now correct and relies on RLS policies on 'projects' table,
 * which checks for the user's membership in 'project_members'.
 */
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


/**
 * Fetches all members for a given project.
 * @param {string} projectId - The ID of the project.
 */
export async function getProjectMembers(projectId) {
    if (!supabase) return [];
    const { data, error } = await supabase
        .from('project_members')
        .select(`
            user_id,
            role,
            profile:profiles ( full_name, avatar_url, email )
        `)
        .eq('project_id', projectId);

    if (error) {
        console.error('Error fetching project members:', error);
        return [];
    }
    return data;
}

/**
 * Invites a user to a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} email - The email of the user to invite.
 */
export async function inviteProjectMember(projectId, email) {
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('manage-project-members', {
        body: { action: 'invite', project_id: projectId, email },
    });
    if (error) return { error };
    return { data };
}

/**
 * Updates the role of a project member.
 * @param {string} projectId - The ID of the project.
 * @param {string} userId - The ID of the user.
 * @param {string} role - The new role.
 */
export async function updateProjectMemberRole(projectId, userId, role) {
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('manage-project-members', {
        body: { action: 'update_role', project_id: projectId, user_id: userId, role },
    });
    if (error) return { error };
    return { data };
}

/**
 * Removes a member from a project.
 * @param {string} projectId - The ID of the project.
 * @param {string} userId - The ID of the user to remove.
 */
export async function removeProjectMember(projectId, userId) {
    if (!supabase) return null;
    const { data, error } = await supabase.functions.invoke('manage-project-members', {
        body: { action: 'remove', project_id: projectId, user_id: userId },
    });
    if (error) return { error };
    return { data };
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
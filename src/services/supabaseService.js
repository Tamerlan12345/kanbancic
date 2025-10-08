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
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }

    return data;
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
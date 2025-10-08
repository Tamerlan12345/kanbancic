import { createClient } from '@supabase/supabase-js';

// This module-level variable will hold the Supabase client instance.
let supabaseClient = null;

/**
 * Initializes the Supabase client by dynamically and safely importing the configuration.
 * This function must be called before any other function in this module.
 */
export async function initSupabase() {
    let APP_CONFIG = {};

    try {
        // Dynamically import the config from the project root.
        const configModule = await import('/config.js');
        APP_CONFIG = configModule.APP_CONFIG;
    } catch (error) {
        console.warn("`config.js` not found. Please copy `config.example.js` to `config.js` and fill in your credentials.");
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY } = APP_CONFIG;

    // Initialize the client only if the credentials are valid and not placeholders.
    if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase client not initialized due to missing or placeholder credentials. The application will run in offline mode.");
    }
}

/**
 * Fetches all tasks for a specified project.
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<Array>} - An array of task objects.
 */
export async function getTasks(projectId) {
    if (!supabaseClient) {
        console.log("Offline mode: cannot fetch tasks.");
        return []; // Return empty array if client is not available.
    }

    const { data, error } = await supabaseClient
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
    if (!supabaseClient) {
        console.log("Offline mode: cannot update task status.");
        return null; // Return null if client is not available.
    }

    const { data, error } = await supabaseClient
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
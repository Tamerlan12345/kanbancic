// This module now uses an explicit initialization pattern to avoid top-level await issues.

let supabaseClient = null;

/**
 * Initializes the Supabase client by dynamically and safely importing the configuration.
 * This function must be called before any other function in this module.
 */
export async function initSupabase() {
    let APP_CONFIG = {};

    try {
        // Dynamically import the config to prevent the app from crashing if it's not present.
        const configModule = await import('../config.js');
        APP_CONFIG = configModule.APP_CONFIG;
    } catch (error) {
        console.warn("`js/config.js` not found. Using fallback. Please copy `js/config.example.js` to `js/config.js` and fill in your credentials.");
    }

    const { SUPABASE_URL, SUPABASE_ANON_KEY } = APP_CONFIG;

    // Initialize the client only if the credentials are valid and not placeholders.
    if (SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE')) {
        // Supabase is loaded globally from the <script> tag in index.html.
        const { createClient } = supabase;
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn("Supabase client not initialized due to missing or placeholder credentials. The application will run in offline mode.");
    }
}

/**
 * Получает все задачи для указанного проекта.
 * @param {string} projectId - ID проекта.
 * @returns {Promise<Array>} - Массив объектов задач.
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
        console.error('Ошибка при получении задач:', error);
        return [];
    }

    return data;
}

/**
 * Обновляет статус задачи.
 * @param {string} taskId - ID задачи для обновления.
 * @param {string} newStatus - Новый статус задачи.
 * @returns {Promise<Object|null>} - Обновленные данные или null в случае ошибки.
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
        console.error('Ошибка при обновлении статуса задачи:', error);
        return null;
    }

    return data;
}
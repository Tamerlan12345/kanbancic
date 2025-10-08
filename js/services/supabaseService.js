import { APP_CONFIG } from '../config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

const { SUPABASE_URL, SUPABASE_ANON_KEY } = APP_CONFIG;

// We check for valid Supabase credentials. If they aren't present, we log a warning
// but allow the application to continue loading. This allows the UI to render
// error states (like 'Project ID not found') without crashing the entire app.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY')) {
    console.warn("Supabase credentials are not configured. The application will not be able to fetch data from the backend. Please copy `js/config.example.js` to `js/config.js` and fill in your credentials.");
}

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Получает все задачи для указанного проекта.
 * @param {string} projectId - ID проекта.
 * @returns {Promise<Array>} - Массив объектов задач.
 */
export async function getTasks(projectId) {
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
// --- Supabase Client Setup ---
// Используем глобальный объект конфигурации, который загружается из js/config.js
const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.APP_CONFIG;

// Проверяем, что конфигурация загружена
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase URL или Anon Key не найдены. Убедитесь, что файл js/config.js существует и загружен правильно.");
}

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Data Fetching Functions ---

/**
 * Получает все задачи для указанного проекта.
 * @param {string} projectId - ID проекта.
 * @returns {Promise<Array>} - Массив объектов задач.
 */
async function getTasks(projectId) {
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
async function updateTaskStatus(taskId, newStatus) {
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


// Экспортируем функции для использования в других частях приложения
window.supabaseService = {
    getTasks,
    updateTaskStatus,
};
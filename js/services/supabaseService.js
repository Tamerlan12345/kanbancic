// --- Supabase Client Setup ---
const SUPABASE_URL = 'https://gqdwplbvxopanapxzlaw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxZHdwbGJ2eG9wYW5hcHh6bGF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4MTk0MzYsImV4cCI6MjA3NTM5NTQzNn0.nk5jkXjN3gB1baycirRTU2nZelMklNf8CAWPkLamMLc';

// Создаем и экспортируем клиент Supabase
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

// Экспортируем функции для использования в других частях приложения
window.supabaseService = {
    getTasks,
};
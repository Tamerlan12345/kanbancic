// --- Composable for Kanban Board Logic ---

const { ref, onMounted, computed } = Vue;

/**
 * Преобразует плоский список задач в иерархическую структуру (дерево).
 * @param {Array} tasks - Плоский массив задач из базы данных.
 * @returns {Array} - Массив задач верхнего уровня с вложенными дочерними задачами.
 */
function buildTaskHierarchy(tasks) {
    const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] }]));
    const rootTasks = [];

    for (const task of taskMap.values()) {
        if (task.parent_id && taskMap.has(task.parent_id)) {
            // Если есть родитель, добавляем задачу в его список дочерних
            taskMap.get(task.parent_id).children.push(task);
        } else {
            // Если родителя нет, это задача верхнего уровня
            rootTasks.push(task);
        }
    }
    return rootTasks;
}


function useKanban(projectId) {
    const tasks = ref([]);

    const columns = ref([
        { id: 'Backlog', title: 'Бэклог', tasks: [] },
        { id: 'To Do', title: 'К выполнению', tasks: [] },
        { id: 'In Progress', title: 'В работе', tasks: [] },
        { id: 'Done', title: 'Готово', tasks: [] },
    ]);

    /**
     * Получает задачи, строит иерархию и распределяет их по колонкам.
     */
    async function fetchAndDistributeTasks() {
        const fetchedTasks = await window.supabaseService.getTasks(projectId);
        tasks.value = fetchedTasks;

        // Строим иерархию из плоского списка
        const hierarchicalTasks = buildTaskHierarchy(fetchedTasks);

        columns.value.forEach(col => col.tasks = []);

        // Распределяем по колонкам только задачи верхнего уровня
        hierarchicalTasks.forEach(task => {
            const column = columns.value.find(col => col.id === task.status);
            if (column) {
                column.tasks.push(task);
            }
        });
    }

    onMounted(fetchAndDistributeTasks);

    return {
        columns,
        fetchTasks: fetchAndDistributeTasks,
    };
}

window.useKanban = useKanban;
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

    /**
     * Обрабатывает перемещение задачи, обновляя ее статус.
     * @param {string} taskId - ID задачи, которую переместили.
     * @param {string} newStatus - Новый статус (ID колонки, куда переместили).
     */
    async function handleTaskDrop(taskId, newStatus) {
        // Оптимистичное обновление UI: немедленно перемещаем задачу
        let taskToMove;
        let sourceColumn;

        // Находим и удаляем задачу из исходной колонки
        for (const col of columns.value) {
            const taskIndex = col.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                sourceColumn = col;
                taskToMove = col.tasks.splice(taskIndex, 1)[0];
                break;
            }
        }

        // Добавляем задачу в новую колонку
        if (taskToMove) {
            const destinationColumn = columns.value.find(c => c.id === newStatus);
            if (destinationColumn) {
                taskToMove.status = newStatus; // Обновляем статус в объекте
                destinationColumn.tasks.push(taskToMove);
            }
        } else {
            console.error("Не удалось найти перемещаемую задачу в UI.");
            return; // Выходим, если задача не найдена
        }

        // Асинхронно обновляем данные в базе данных
        const updatedTask = await window.supabaseService.updateTaskStatus(taskId, newStatus);

        // Если обновление в БД не удалось, откатываем изменения в UI
        if (!updatedTask) {
            console.error(`Не удалось сохранить новый статус для задачи ${taskId}. Откат UI.`);
            // Удаляем задачу из новой колонки
            const destinationColumn = columns.value.find(c => c.id === newStatus);
            if (destinationColumn) {
                const taskIndex = destinationColumn.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    destinationColumn.tasks.splice(taskIndex, 1);
                }
            }
            // Возвращаем задачу в исходную колонку
            if (sourceColumn) {
                taskToMove.status = sourceColumn.id; // Возвращаем старый статус
                sourceColumn.tasks.push(taskToMove);
            }
        }
    }

    onMounted(fetchAndDistributeTasks);

    return {
        columns,
        fetchTasks: fetchAndDistributeTasks,
        handleTaskDrop,
    };
}

window.useKanban = useKanban;
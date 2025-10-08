import * as Vue from 'https://cdn.jsdelivr.net/npm/vue@3';
import { getTasks, updateTaskStatus } from '../services/supabaseService.js';

const { ref, onMounted } = Vue;

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
            taskMap.get(task.parent_id).children.push(task);
        } else {
            rootTasks.push(task);
        }
    }
    return rootTasks;
}

export function useKanban(projectId) {
    const tasks = ref([]);
    const columns = ref([
        { id: 'Backlog', title: 'Бэклог', tasks: [] },
        { id: 'To Do', title: 'К выполнению', tasks: [] },
        { id: 'In Progress', title: 'В работе', tasks: [] },
        { id: 'Done', title: 'Готово', tasks: [] },
    ]);

    async function fetchAndDistributeTasks() {
        const fetchedTasks = await getTasks(projectId);
        tasks.value = fetchedTasks;
        const hierarchicalTasks = buildTaskHierarchy(fetchedTasks);

        columns.value.forEach(col => col.tasks = []);

        hierarchicalTasks.forEach(task => {
            const column = columns.value.find(col => col.id === task.status);
            if (column) {
                column.tasks.push(task);
            }
        });
    }

    async function handleTaskDrop(taskId, newStatus) {
        let taskToMove;
        let sourceColumn;

        for (const col of columns.value) {
            const taskIndex = col.tasks.findIndex(t => t.id === taskId);
            if (taskIndex !== -1) {
                sourceColumn = col;
                taskToMove = col.tasks.splice(taskIndex, 1)[0];
                break;
            }
        }

        if (taskToMove) {
            const destinationColumn = columns.value.find(c => c.id === newStatus);
            if (destinationColumn) {
                taskToMove.status = newStatus;
                destinationColumn.tasks.push(taskToMove);
            }
        } else {
            console.error("Не удалось найти перемещаемую задачу в UI.");
            return;
        }

        const updatedTask = await updateTaskStatus(taskId, newStatus);

        if (!updatedTask) {
            console.error(`Не удалось сохранить новый статус для задачи ${taskId}. Откат UI.`);
            const destinationColumn = columns.value.find(c => c.id === newStatus);
            if (destinationColumn) {
                const taskIndex = destinationColumn.tasks.findIndex(t => t.id === taskId);
                if (taskIndex !== -1) {
                    destinationColumn.tasks.splice(taskIndex, 1);
                }
            }
            if (sourceColumn) {
                taskToMove.status = sourceColumn.id;
                sourceColumn.tasks.push(taskToMove);
            }
        }
    }

    onMounted(fetchAndDistributeTasks);

    return {
        columns,
        handleTaskDrop,
    };
}
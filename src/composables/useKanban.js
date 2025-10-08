import { ref, onMounted } from 'vue';
import { getTasks, updateTaskStatus, createTask } from '../services/supabaseService.js';
import { useLogger } from './useLogger.js';

/**
 * Transforms a flat list of tasks into a hierarchical structure (a tree).
 * @param {Array} tasks - A flat array of task objects from the database.
 * @returns {Array} - An array of top-level tasks with nested children.
 */
function buildTaskHierarchy(tasks) {
    const taskMap = new Map(tasks.map(task => [task.id, { ...task, children: [] }]));
    const rootTasks = [];

    for (const task of taskMap.values()) {
        if (task.parent_id && taskMap.has(task.parent_id)) {
            const parent = taskMap.get(task.parent_id);
            if (parent) {
                parent.children.push(task);
            }
        } else {
            rootTasks.push(task);
        }
    }
    return rootTasks;
}

export function useKanban(projectId) {
    const { info: logInfo, error: logError } = useLogger();
    const isLoading = ref(true); // Add loading state
    const columns = ref([
        { id: 'Backlog', title: 'Бэклог', tasks: [] },
        { id: 'To Do', title: 'К выполнению', tasks: [] },
        { id: 'In Progress', title: 'В работе', tasks: [] },
        { id: 'Done', title: 'Готово', tasks: [] },
    ]);

    /**
     * Fetches tasks from the service and distributes them into the correct columns.
     */
    async function fetchAndDistributeTasks() {
        isLoading.value = true;
        try {
            if (!projectId) {
                return; // Do not fetch if there is no project ID.
            }
            const fetchedTasks = await getTasks(projectId);

            if (fetchedTasks.length === 0) {
                logInfo("DIAGNOSTIC: getTasks() returned an empty array. This might be because the project has no tasks or because of restrictive Row-Level Security (RLS) policies on the 'tasks' table in Supabase.", { projectId });
            }

        const hierarchicalTasks = buildTaskHierarchy(fetchedTasks);

        // Reset all columns
        columns.value.forEach(col => col.tasks = []);

        // Distribute tasks into columns
        hierarchicalTasks.forEach(task => {
            const column = columns.value.find(col => col.id === task.status);
            if (column) {
                column.tasks.push(task);
            }
        });
        } catch (error) {
            logError('Failed to fetch and distribute tasks', error);
        } finally {
            isLoading.value = false;
        }
    }

    /**
     * Handles the drop event when a task is moved to a new column.
     * Implements an optimistic update with a robust rollback mechanism.
     * @param {string} taskId - The ID of the task that was moved.
     * @param {string} newStatus - The new status (column ID) of the task.
     */
    async function handleTaskDrop(taskId, newStatus) {
        // 1. Save a deep copy of the current state for potential rollback.
        const previousState = JSON.parse(JSON.stringify(columns.value));

        // 2. Find the task and its source column for the optimistic UI update.
        let taskToMove;
        let sourceColumnId;

        for (const col of columns.value) {
            const taskIndex = col.tasks.findIndex(t => t.id.toString() === taskId);
            if (taskIndex !== -1) {
                sourceColumnId = col.id;
                taskToMove = col.tasks.splice(taskIndex, 1)[0];
                break;
            }
        }

        if (!taskToMove) {
            logError("Could not find the moved task in the UI.", { taskId });
            return;
        }

        // 3. Perform the optimistic update in the UI.
        const destinationColumn = columns.value.find(c => c.id === newStatus);
        if (destinationColumn) {
            destinationColumn.tasks.push({ ...taskToMove, status: newStatus });
        } else {
             logError("Could not find the destination column.", { taskId, newStatus });
             columns.value = previousState; // Rollback if destination is invalid
             return;
        }

        // 4. Call the API to persist the change.
        const updatedTask = await updateTaskStatus(taskId, newStatus);

        // 5. If the API call fails, roll back the UI to the saved state.
        if (!updatedTask) {
            logError(`Failed to save the new status for task ${taskId}. Rolling back UI.`, { taskId, newStatus });
            columns.value = previousState;
        }
    }

    /**
     * Handles the creation of a new task.
     * @param {Object} taskData - The data for the new task from the modal.
     */
    async function addNewTask(taskData) {
        const newTask = await createTask(taskData, projectId);
        if (newTask) {
            // Add an empty children array to be consistent with the data structure
            const taskWithChildren = { ...newTask, children: [] };
            const column = columns.value.find(col => col.id === taskWithChildren.status);
            if (column) {
                column.tasks.push(taskWithChildren);
            } else {
                logError("Could not find column to add new task to.", { status: taskWithChildren.status });
            }
        } else {
            logError("Failed to create task in the backend.", { taskData });
            // Optionally, show a user-facing error message here.
        }
    }

    // Fetch tasks when the composable is mounted.
    onMounted(fetchAndDistributeTasks);

    return {
        columns,
        isLoading,
        handleTaskDrop,
        addNewTask,
    };
}
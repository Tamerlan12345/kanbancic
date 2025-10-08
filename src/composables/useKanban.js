import { ref, onMounted } from 'vue';
import { getTasks, updateTaskStatus } from '../services/supabaseService.js';

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
    const columns = ref([
        { id: 'Backlog', title: 'Backlog', tasks: [] },
        { id: 'To Do', title: 'To Do', tasks: [] },
        { id: 'In Progress', title: 'In Progress', tasks: [] },
        { id: 'Done', title: 'Done', tasks: [] },
    ]);

    /**
     * Fetches tasks from the service and distributes them into the correct columns.
     */
    async function fetchAndDistributeTasks() {
        const fetchedTasks = await getTasks(projectId);
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
            console.error("Could not find the moved task in the UI.");
            return;
        }

        // 3. Perform the optimistic update in the UI.
        const destinationColumn = columns.value.find(c => c.id === newStatus);
        if (destinationColumn) {
            destinationColumn.tasks.push({ ...taskToMove, status: newStatus });
        } else {
             console.error("Could not find the destination column.");
             columns.value = previousState; // Rollback if destination is invalid
             return;
        }

        // 4. Call the API to persist the change.
        const updatedTask = await updateTaskStatus(taskId, newStatus);

        // 5. If the API call fails, roll back the UI to the saved state.
        if (!updatedTask) {
            console.error(`Failed to save the new status for task ${taskId}. Rolling back UI.`);
            columns.value = previousState;
        }
    }

    // Fetch tasks when the composable is mounted.
    onMounted(fetchAndDistributeTasks);

    return {
        columns,
        handleTaskDrop,
    };
}
// Import Vue features and other necessary modules
import * as Vue from 'https://cdn.jsdelivr.net/npm/vue@3';
import { useKanban } from './composables/useKanban.js';

const { createApp, defineComponent, nextTick, onMounted, ref } = Vue;

// --- TaskCard Component ---
// This component is defined here because it's tightly coupled with the main app structure.
// Using defineComponent is good practice, especially for components that might be recursive.
const TaskCard = defineComponent({
    name: 'TaskCard',
    props: {
        task: { type: Object, required: true }
    },
    // The template includes a recursive call to itself to render child tasks.
    template: `
        <div class="kanban-task" :data-task-id="task.id">
            <p class="task-title">{{ task.title }}</p>
            <span class="task-priority">{{ task.priority }}</span>
            <div v-if="task.children && task.children.length > 0" class="child-tasks">
                <TaskCard v-for="child in task.children" :key="child.id" :task="child" />
            </div>
        </div>
    `
});

// --- Root App Component ---
const App = {
    components: {
        TaskCard
    },
    setup() {
        const urlParams = new URLSearchParams(window.location.search);
        const projectId = urlParams.get('projectId');
        const showError = ref(!projectId);

        // If no project ID is found, we'll show an error and stop.
        if (showError.value) {
            return {
                showError,
                columns: ref([]), // Provide an empty ref for columns to avoid template errors.
            };
        }

        // If a project ID exists, set up the Kanban board logic.
        const { columns, handleTaskDrop } = useKanban(projectId);

        // Initialize the SortableJS library for drag-and-drop functionality.
        // This is done in onMounted to ensure the DOM elements are present.
        onMounted(() => {
            nextTick(() => { // nextTick ensures v-for has finished rendering.
                const columnElements = document.querySelectorAll('.column-tasks');
                columnElements.forEach(columnEl => {
                    // Sortable is available globally from the CDN script in index.html.
                    new Sortable(columnEl, {
                        group: 'kanban-tasks',
                        animation: 150,
                        ghostClass: 'sortable-ghost',
                        onEnd: (evt) => {
                            const taskId = evt.item.dataset.taskId;
                            const newStatus = evt.to.dataset.columnId;
                            if (evt.from !== evt.to) {
                                handleTaskDrop(taskId, newStatus);
                            }
                        }
                    });
                });
            });
        });

        return {
            columns,
            showError,
        };
    },
    // The main template conditionally renders the error message or the Kanban board.
    template: `
        <div v-if="showError" class="error-container">
            <h1>Ошибка: ID проекта не найден</h1>
            <p>Пожалуйста, укажите <code>?projectId=...</code> в URL-адресе.</p>
        </div>
        <div v-else class="kanban-board">
            <div v-for="column in columns" :key="column.id" class="kanban-column">
                <h2 class="column-title">{{ column.title }} ({{ column.tasks.length }})</h2>
                <div class="column-tasks" :data-column-id="column.id">
                    <TaskCard v-for="task in column.tasks" :key="task.id" :task="task" />
                </div>
            </div>
        </div>
    `
};

// Since this script is loaded as a module, it's deferred by default.
// The DOM will be ready when it executes, so we can mount the app directly.
createApp(App).mount('#app');
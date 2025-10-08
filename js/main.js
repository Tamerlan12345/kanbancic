// Import Vue features and other necessary modules
import { createApp, defineComponent, nextTick, onMounted, ref } from 'https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.js';
import { useKanban } from './composables/useKanban.js';
import { initSupabase } from './services/supabaseService.js'; // Import the new init function

// --- TaskCard Component ---
// This component is defined here because it's tightly coupled with the main app structure.
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

        // Initialize SortableJS for drag-and-drop functionality.
        onMounted(() => {
            nextTick(() => { // nextTick ensures v-for has finished rendering.
                const columnElements = document.querySelectorAll('.column-tasks');
                columnElements.forEach(columnEl => {
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
    // The template is now correctly located in index.html, so this property is removed.
};

// --- App Initialization ---
// We wrap the app mount in an async function to ensure all prerequisite async operations are complete.
async function initializeAndMountApp() {
    // First, initialize the Supabase service. This will handle loading the config safely.
    await initSupabase();

    // Once initialization is complete, create and mount the Vue app.
    // This will remove the v-cloak attribute.
    createApp(App).mount('#app');
}

// Start the application.
initializeAndMountApp();
const { createApp, defineComponent } = Vue;
const { useKanban } = window;

// --- Компонент для отображения Задачи (может быть рекурсивным) ---
const TaskCard = defineComponent({
    name: 'TaskCard', // 'name' важен для рекурсивных вызовов
    props: {
        task: { type: Object, required: true }
    },
    template: `
        <div class="kanban-task">
            <p class="task-title">{{ task.title }}</p>
            <span class="task-priority">{{ task.priority }}</span>

            <div v-if="task.children && task.children.length > 0" class="child-tasks">
                <!-- Vue сможет найти 'TaskCard' по его имени для рекурсии -->
                <TaskCard v-for="child in task.children" :key="child.id" :task="child" />
            </div>
        </div>
    `
});

// --- Корневой компонент Приложения ---
const App = {
    components: {
        TaskCard // Локально регистрируем TaskCard для использования в шаблоне App
    },
    setup() {
        const projectId = '00000000-0000-0000-0000-000000000000';
        const { columns } = useKanban(projectId);
        return {
            columns,
        };
    },
    template: `
        <div class="kanban-board">
            <div v-for="column in columns" :key="column.id" class="kanban-column">
                <h2 class="column-title">{{ column.title }} ({{ column.tasks.length }})</h2>
                <div class="column-tasks">
                    <TaskCard v-for="task in column.tasks" :key="task.id" :task="task" />
                </div>
            </div>
        </div>
    `
};

// Создаем приложение с App в качестве корневого компонента и монтируем его
createApp(App).mount('#app');
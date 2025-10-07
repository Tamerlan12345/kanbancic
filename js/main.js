const { createApp, defineComponent, onMounted, nextTick } = Vue;
const { useKanban } = window;

// --- Компонент для отображения Задачи ---
const TaskCard = defineComponent({
    name: 'TaskCard',
    props: {
        task: { type: Object, required: true }
    },
    // Добавляем data-атрибут для идентификации задачи
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

// --- Корневой компонент Приложения ---
const App = {
    components: {
        TaskCard
    },
    setup() {
        const projectId = '00000000-0000-0000-0000-000000000000';
        // Получаем обработчик из нашего composable
        const { columns, handleTaskDrop } = useKanban(projectId);

        // Инициализируем SortableJS после того, как DOM будет готов
        onMounted(() => {
            // nextTick гарантирует, что v-for уже отрисовал все элементы
            nextTick(() => {
                const columnElements = document.querySelectorAll('.column-tasks');
                columnElements.forEach(columnEl => {
                    new Sortable(columnEl, {
                        group: 'kanban-tasks', // Общая группа для всех колонок
                        animation: 150,
                        ghostClass: 'sortable-ghost', // CSS-класс для "призрака" элемента

                        // Вызывается при завершении перетаскивания
                        onEnd: (evt) => {
                            const taskId = evt.item.dataset.taskId;
                            const newStatus = evt.to.dataset.columnId;

                            // Вызываем нашу логику, только если колонка изменилась
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
        };
    },
    // Добавляем data-атрибут для идентификации колонки
    template: `
        <div class="kanban-board">
            <div v-for="column in columns" :key="column.id" class="kanban-column">
                <h2 class="column-title">{{ column.title }} ({{ column.tasks.length }})</h2>
                <div class="column-tasks" :data-column-id="column.id">
                    <TaskCard v-for="task in column.tasks" :key="task.id" :task="task" />
                </div>
            </div>
        </div>
    `
};

// Создаем и монтируем приложение
createApp(App).mount('#app');
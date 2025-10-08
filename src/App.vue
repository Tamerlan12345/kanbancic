<template>
  <div v-if="showError" class="error-container">
    <h1>Error: Project ID Not Found</h1>
    <p>Please provide a <code>?projectId=...</code> in the URL.</p>
  </div>
  <div v-else class="kanban-board">
    <div v-for="column in columns" :key="column.id" class="kanban-column">
      <h2 class="column-title">{{ column.title }} ({{ column.tasks.length }})</h2>
      <div class="column-tasks" :data-column-id="column.id">
        <TaskCard v-for="task in column.tasks" :key="task.id" :task="task" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Sortable from 'sortablejs';
import { useKanban } from './composables/useKanban.js';
import TaskCard from './components/TaskCard.vue';

// --- State Initialization ---
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');
const showError = ref(!projectId);

// Initialize columns directly. If no project ID, the composable will handle it gracefully.
const { columns, handleTaskDrop } = useKanban(projectId);

// --- Hooks ---
onMounted(() => {
  // Only initialize SortableJS if the Kanban board is being rendered.
  if (!showError.value) {
    nextTick(() => {
      const columnElements = document.querySelectorAll('.column-tasks');
      columnElements.forEach(columnEl => {
        new Sortable(columnEl, {
          group: 'kanban-tasks',
          animation: 150,
          ghostClass: 'sortable-ghost',
          onEnd: (evt) => {
            const taskId = evt.item.dataset.taskId;
            const newStatus = evt.to.dataset.columnId;
            if (evt.from !== evt.to && taskId && newStatus) {
              handleTaskDrop(taskId, newStatus);
            }
          }
        });
      });
    });
  }
});
</script>

<style scoped>
.kanban-board {
  display: flex;
  gap: 20px;
  padding: 20px;
  overflow-x: auto;
}

.kanban-column {
  flex: 1;
  min-width: 280px;
  background-color: #f4f5f7;
  border-radius: 8px;
  padding: 10px;
}

.column-title {
  font-size: 1.2em;
  font-weight: bold;
  margin-bottom: 15px;
  padding: 0 5px;
}

.column-tasks {
  min-height: 200px;
}

.error-container {
  text-align: center;
  padding: 50px;
}
</style>
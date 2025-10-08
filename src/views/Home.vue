<template>
  <div v-if="showError" class="error-container">
    <h1>Error</h1>
    <p>{{ errorMessage }}</p>
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
import { useKanban } from '../composables/useKanban.js';
import TaskCard from '../components/TaskCard.vue';
import { checkProjectExists } from '../services/supabaseService.js';

// --- State Initialization ---
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');
const showError = ref(false); // Default to false, check in onMounted
const errorMessage = ref(''); // To hold the specific error message

// Initialize columns directly. The composable will only fetch tasks if projectId is valid.
const { columns, handleTaskDrop } = useKanban(projectId);

// --- Hooks ---
onMounted(async () => {
  if (!projectId) {
    showError.value = true;
    errorMessage.value = 'Project ID not provided. Please add `?projectId=` to the URL.';
    return;
  }

  const projectExists = await checkProjectExists(projectId);
  if (!projectExists) {
    showError.value = true;
    errorMessage.value = `Project with ID "${projectId}" was not found. Please verify the ID.`;
    return;
  }

  // If project exists, initialize SortableJS
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
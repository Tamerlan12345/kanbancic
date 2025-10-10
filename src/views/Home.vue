<template>
  <div v-if="showError" class="error-container">
    <h1>Ошибка</h1>
    <p>{{ errorMessage }}</p>
  </div>
  <div v-else class="kanban-page-container">
    <header class="kanban-header">
      <h1 class="project-title-header">Доска проекта</h1>
      <button class="create-task-button" @click="isCreateModalOpen = true">Создать задачу</button>
    </header>
    <div class="kanban-board">
      <div v-for="column in columns" :key="column.id" class="kanban-column">
        <h2 class="column-title">{{ column.title }} ({{ isLoading ? '...' : column.tasks.length }})</h2>
        <div v-if="isLoading" class="column-tasks">
          <TaskCardSkeleton v-for="n in 3" :key="n" />
        </div>
        <div v-else class="column-tasks" :data-column-id="column.id">
          <div v-if="column.tasks.length === 0" class="empty-column-message">
            <p>Задач в этой колонке нет.</p>
          </div>
          <TaskCard
            v-for="task in column.tasks"
            :key="task.id"
            :task="task"
            @view-task="handleViewTask"
          />
        </div>
      </div>
    </div>
    <!-- Modal for creating tasks -->
    <TaskModal v-if="isCreateModalOpen" :project-id="projectId" @close="isCreateModalOpen = false" @save="handleCreateTask" />
    <!-- Modal for viewing task details -->
    <TaskDetailModal
      v-if="isDetailModalOpen"
      :task-id="selectedTask.id"
      :task-title="selectedTask.title"
      @close="isDetailModalOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Sortable from 'sortablejs';
import { useKanban } from '../composables/useKanban.js';
import TaskCard from '../components/TaskCard.vue';
import TaskCardSkeleton from '../components/TaskCardSkeleton.vue';
import TaskModal from '../components/TaskModal.vue';
import TaskDetailModal from '../components/TaskDetailModal.vue';
import { checkProjectExists } from '../services/supabaseService.js';

// --- State Initialization ---
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('projectId');
const showError = ref(false); // Default to false, check in onMounted
const errorMessage = ref(''); // To hold the specific error message
const isCreateModalOpen = ref(false);
const isDetailModalOpen = ref(false);
const selectedTask = ref(null);

// Initialize columns directly. The composable will only fetch tasks if projectId is valid.
const { columns, isLoading, handleTaskDrop, addNewTask } = useKanban(projectId);

const handleCreateTask = async (taskData) => {
  await addNewTask(taskData);
  isCreateModalOpen.value = false;
};

const handleViewTask = (task) => {
  selectedTask.value = task;
  isDetailModalOpen.value = true;
};

// --- Hooks ---
onMounted(async () => {
  if (!projectId) {
    showError.value = true;
    errorMessage.value = 'ID проекта не указан. Пожалуйста, добавьте `?projectId=` в URL.';
    return;
  }

  const projectExists = await checkProjectExists(projectId);
  if (!projectExists) {
    showError.value = true;
    errorMessage.value = `Проект с ID "${projectId}" не найден. Пожалуйста, проверьте ID.`;
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
.kanban-page-container {
  padding: 0 20px 20px 20px;
}

.kanban-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #e0e0e0;
  margin-bottom: 20px;
}

.project-title-header {
  font-size: 1.8em;
  margin: 0;
}

.create-task-button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 15px;
  font-size: 1em;
  cursor: pointer;
  transition: background-color 0.2s;
}

.create-task-button:hover {
  background-color: #0056b3;
}

.kanban-board {
  display: flex;
  gap: 20px;
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

.empty-column-message {
  text-align: center;
  color: #888;
  padding: 20px;
  border: 2px dashed #ddd;
  border-radius: 8px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
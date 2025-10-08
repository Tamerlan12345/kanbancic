<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <h3>Детали задачи: {{ taskTitle }}</h3>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </header>

      <nav class="modal-nav">
        <button
          v-for="tab in tabs"
          :key="tab"
          :class="['nav-button', { active: activeTab === tab }]"
          @click="activeTab = tab">
          {{ tab }}
        </button>
      </nav>

      <main class="modal-body">
        <div v-if="activeTab === 'Детали'">
          <div v-if="taskData" class="task-details-grid">
            <div class="detail-item">
              <strong>Статус</strong>
              <span>{{ taskData.status }}</span>
            </div>
            <div class="detail-item">
              <strong>Приоритет</strong>
              <span>{{ taskData.priority }}</span>
            </div>
            <div class="detail-item full-width">
              <strong>Описание</strong>
              <p>{{ taskData.description || 'Описание отсутствует.' }}</p>
            </div>
          </div>
          <div v-else>
            <p>Загрузка данных о задаче...</p>
          </div>
        </div>
        <div v-if="activeTab === 'Чек-листы'">
          <div class="checklist-container">
            <div class="add-item-form">
              <input
                type="text"
                v-model="newChecklistItem"
                placeholder="Добавить новый пункт..."
                @keyup.enter="handleAddChecklistItem"
              />
              <button @click="handleAddChecklistItem">+</button>
            </div>
            <ul class="checklist">
              <li v-for="item in checklist" :key="item.id" class="checklist-item">
                <input
                  type="checkbox"
                  :checked="item.is_completed"
                  @change="toggleChecklistItem(item)"
                />
                <span :class="{ completed: item.is_completed }">{{ item.title }}</span>
                <button class="delete-item-btn" @click="handleDeleteChecklistItem(item.id)">&times;</button>
              </li>
            </ul>
          </div>
        </div>
        <div v-if="activeTab === 'Учет времени'">
          <div v-if="taskData" class="time-tracking-container">
            <div class="time-field">
              <label for="estimated_time">Оценка (e.g., 2h 30m)</label>
              <input type="text" id="estimated_time" v-model="timeTracking.estimated" />
            </div>
            <div class="time-field">
              <label for="logged_time">Затрачено (e.g., 1h 15m)</label>
              <input type="text" id="logged_time" v-model="timeTracking.logged" />
            </div>
            <button class="save-time-btn" @click="handleSaveTimeTracking">Сохранить время</button>
            <p v-if="timeSaveStatus" class="save-status">{{ timeSaveStatus }}</p>
          </div>
           <div v-else>
            <p>Загрузка данных о задаче...</p>
          </div>
        </div>
        <div v-if="activeTab === 'AI-Ассистент'">
          <p>Здесь будет чат с AI-ассистентом...</p>
          <!-- AI assistant chat interface -->
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch, computed } from 'vue';
import {
  getTaskById,
  updateTask,
  getChecklistForTask,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem
} from '../services/supabaseService.js';

const props = defineProps({
  taskId: {
    type: String,
    required: true,
  },
  taskTitle: {
    type: String,
    default: 'Загрузка...',
  }
});

const emit = defineEmits(['close']);

const tabs = ['Детали', 'Чек-листы', 'Учет времени', 'AI-Ассистент'];
const activeTab = ref(tabs[0]);

// --- Task Data State & Logic ---
const taskData = ref(null);

async function fetchTask() {
  if (!props.taskId) return;
  taskData.value = await getTaskById(props.taskId);
  // Also fetch related data
  if (taskData.value) {
    fetchChecklist();
  }
}

// --- Checklist State & Logic ---
const checklist = ref([]);
const newChecklistItem = ref('');

async function fetchChecklist() {
  if (!taskData.value) return;
  checklist.value = await getChecklistForTask(taskData.value.id);
}

async function handleAddChecklistItem() {
  if (newChecklistItem.value.trim() === '') return;
  const newItem = await addChecklistItem(props.taskId, newChecklistItem.value.trim());
  if (newItem) {
    checklist.value.push(newItem);
    newChecklistItem.value = '';
  }
}

async function toggleChecklistItem(item) {
  const updatedItem = await updateChecklistItem(item.id, { is_completed: !item.is_completed });
  if (updatedItem) {
    const index = checklist.value.findIndex(i => i.id === item.id);
    if (index !== -1) {
      checklist.value[index] = updatedItem;
    }
  }
}

async function handleDeleteChecklistItem(itemId) {
  const success = await deleteChecklistItem(itemId);
  if (success) {
    checklist.value = checklist.value.filter(item => item.id !== itemId);
  }
}

// --- Time Tracking State & Logic ---
const timeTracking = ref({ estimated: '', logged: '' });
const timeSaveStatus = ref('');

watch(taskData, (newTask) => {
  if (newTask) {
    timeTracking.value.estimated = newTask.estimated_time || '';
    timeTracking.value.logged = newTask.logged_time || '';
  }
});

async function handleSaveTimeTracking() {
  timeSaveStatus.value = 'Сохранение...';
  const updates = {
    estimated_time: timeTracking.value.estimated,
    logged_time: timeTracking.value.logged,
  };
  const result = await updateTask(props.taskId, updates);
  if (result) {
    timeSaveStatus.value = 'Успешно сохранено!';
  } else {
    timeSaveStatus.value = 'Ошибка при сохранении.';
  }
  setTimeout(() => timeSaveStatus.value = '', 2000);
}

// Fetch data when component is mounted and when the task ID changes
onMounted(fetchTask);
watch(() => props.taskId, fetchTask);

</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: #fff;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.4em;
}

.close-button {
  background: none;
  border: none;
  font-size: 2em;
  cursor: pointer;
  color: #888;
}

.modal-nav {
  display: flex;
  border-bottom: 1px solid #e0e0e0;
  padding: 0 20px;
}

.nav-button {
  background: none;
  border: none;
  padding: 15px 20px;
  cursor: pointer;
  font-size: 1em;
  color: #555;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px; /* Aligns with the parent border */
}

.nav-button.active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
}

/* Checklist Styles */
.checklist-container {
  display: flex;
  flex-direction: column;
}

.add-item-form {
  display: flex;
  margin-bottom: 15px;
}

.add-item-form input {
  flex-grow: 1;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 1em;
}

.add-item-form button {
  flex-shrink: 0;
  margin-left: 10px;
  padding: 8px 15px;
  border: none;
  background-color: #28a745;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.2em;
}

.checklist {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.checklist-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.checklist-item:last-child {
  border-bottom: none;
}

.checklist-item input[type="checkbox"] {
  margin-right: 12px;
  width: 18px;
  height: 18px;
}

.checklist-item span {
  flex-grow: 1;
  color: #333;
}

.checklist-item span.completed {
  text-decoration: line-through;
  color: #888;
}

.delete-item-btn {
  background: none;
  border: none;
  color: #aaa;
  font-size: 1.5em;
  cursor: pointer;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.2s;
}

.checklist-item:hover .delete-item-btn {
  visibility: visible;
  opacity: 1;
}

/* Time Tracking Styles */
.time-tracking-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.time-field {
  display: flex;
  flex-direction: column;
}

.time-field label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #555;
}

.time-field input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
}

.save-time-btn {
  align-self: flex-start;
  padding: 10px 20px;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.save-time-btn:hover {
  background-color: #0056b3;
}

.save-status {
  margin-top: 10px;
  color: #28a745;
}

/* Task Details Styles */
.task-details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item strong {
  color: #555;
  font-size: 0.9em;
}

.detail-item span, .detail-item p {
  font-size: 1em;
  color: #333;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}
</style>
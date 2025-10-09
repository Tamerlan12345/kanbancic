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
          <div class="ai-assistant-container">
            <div class="prompt-buttons">
              <button @click="handlePresetPrompt('Декомпозиция')" :disabled="isAiLoading">Декомпозировать задачу</button>
              <button @click="handlePresetPrompt('Анализ рисков')" :disabled="isAiLoading">Анализ рисков</button>
              <button @click="handlePresetPrompt('User Story')" :disabled="isAiLoading">Сгенерировать User Story</button>
              <button @click="handlePresetPrompt('Отчет о прогрессе')" :disabled="isAiLoading">Отчет о прогрессе</button>
            </div>
            <!-- Interactive AI Response Block -->
            <div v-if="aiInteractiveResponse" class="ai-interactive-response">
              <div v-if="aiInteractiveResponse.type === 'decomposition'" class="interactive-decomposition">
                <div class="interactive-header">
                  <h4>AI предлагает следующие подзадачи:</h4>
                </div>
                <ul class="subtask-list">
                  <li v-for="(task, index) in aiInteractiveResponse.payload" :key="index" class="subtask-item">
                    <input type="checkbox" :id="`subtask-${index}`" :value="task.title" v-model="selectedSubtasks">
                    <label :for="`subtask-${index}`">{{ task.title }}</label>
                  </li>
                </ul>
                <div class="interactive-actions">
                  <button @click="handleCreateSubtasks" :disabled="selectedSubtasks.length === 0 || isAiLoading" class="create-btn">
                    Создать {{ selectedSubtasks.length }} подзадач
                  </button>
                  <button @click="dismissInteractiveResponse" :disabled="isAiLoading" class="dismiss-btn">Отклонить</button>
                </div>
              </div>
              <!-- Future interactive blocks for 'user_story' can be added here -->
            </div>

            <div class="chat-history" ref="chatHistoryEl">
              <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.type, { error: msg.isError }]">
                <p v-html="formatMarkdown(msg.text)"></p>
              </div>
              <div v-if="isAiLoading && !aiInteractiveResponse" class="message assistant">
                <p>Думаю...</p>
              </div>
            </div>
            <div class="chat-input">
              <input
                type="text"
                placeholder="Задайте свой вопрос..."
                v-model="aiPrompt"
                @keyup.enter="handleAiPrompt(aiPrompt)"
                :disabled="isAiLoading"
              />
              <button @click="handleAiPrompt(aiPrompt)" :disabled="isAiLoading">Отправить</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch, computed, nextTick } from 'vue';
import {
  getTaskById,
  updateTask,
  createSubTasks, // <-- Import new function
  getChecklistForTask,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  invokeGeminiProxy,
  getAiConversationHistory,
  saveAiConversation
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

const emit = defineEmits(['close', 'tasks-updated']); // <-- Add 'tasks-updated'

const tabs = ['Детали', 'Чек-листы', 'Учет времени', 'AI-Ассистент'];
const activeTab = ref(tabs[0]);

// --- Task Data State & Logic ---
const taskData = ref(null);

// --- Checklist State & Logic ---
const checklist = ref([]);
const newChecklistItem = ref('');

// --- Time Tracking State & Logic ---
const timeTracking = ref({ estimated: '', logged: '' });
const timeSaveStatus = ref('');

// --- AI Assistant State & Logic ---
const aiConversation = ref([]);
const aiPrompt = ref('');
const isAiLoading = ref(false);
const chatHistoryEl = ref(null); // For autoscrolling
const aiInteractiveResponse = ref(null); // To hold structured AI responses
const selectedSubtasks = ref([]); // To hold user-selected subtasks for creation

// A computed property to format the raw conversation data for display
const chatMessages = computed(() => {
  const messages = [];
  // Show a greeting only if there's no conversation, loading, or interactive response
  if (aiConversation.value.length === 0 && !isAiLoading.value && !aiInteractiveResponse.value) {
      messages.push({ type: 'assistant', text: `Чем могу помочь с задачей "${props.taskTitle}"?` });
  }

  aiConversation.value.forEach(conv => {
    messages.push({ type: 'user', text: conv.prompt });
    if (conv.response) {
      let responseText = '';
      const isError = conv.isError || false;
      try {
        const parsed = JSON.parse(conv.response);
        // Only display 'text' type responses in the main chat history
        if (parsed.type === 'text') {
          responseText = parsed.payload;
        }
        // Interactive types are handled by the `aiInteractiveResponse` state
        // and won't be displayed directly in the chat log.
      } catch (e) {
        // Fallback for older, non-JSON responses from history
        responseText = conv.response;
      }
      // Add the message to the chat only if it's meant for display
      if(responseText) {
          messages.push({ type: 'assistant', text: responseText, isError });
      }
    }
  });
  return messages;
});

// Simple markdown formatter to handle line breaks from the AI
function formatMarkdown(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br />');
}

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

async function fetchAiHistory() {
  if (!taskData.value) return;
  aiConversation.value = await getAiConversationHistory(props.taskId);
}

async function handleAiPrompt(promptText) {
  if (!promptText || isAiLoading.value) return;

  const currentPrompt = promptText;
  aiPrompt.value = ''; // Clear input immediately
  isAiLoading.value = true;
  aiInteractiveResponse.value = null; // Clear previous interactive UI
  selectedSubtasks.value = []; // Clear selections

  const response = await invokeGeminiProxy(currentPrompt);

  isAiLoading.value = false;

  if (response) {
    // Save the raw, stringified JSON response to the database for history
    await saveAiConversation(props.taskId, currentPrompt, JSON.stringify(response));

    if (response.type === 'decomposition' || response.type === 'user_story') {
      // If the response is interactive, display the special UI component
      aiInteractiveResponse.value = response;
    } else {
      // If it's a standard text response, refresh the chat history to display it
      await fetchAiHistory();
    }
  } else {
    // Handle cases where the AI invocation fails
    aiConversation.value.push({
      prompt: currentPrompt,
      response: 'Произошла ошибка при обращении к AI. Пожалуйста, попробуйте еще раз.',
      isError: true,
    });
  }

  // Scroll to the bottom of the chat history
  await nextTick();
  if (chatHistoryEl.value) {
    chatHistoryEl.value.scrollTop = chatHistoryEl.value.scrollHeight;
  }
}

// --- New functions for interactive AI responses ---
function dismissInteractiveResponse() {
  aiInteractiveResponse.value = null;
  selectedSubtasks.value = [];
}

async function handleCreateSubtasks() {
  if (selectedSubtasks.value.length === 0) return;

  const tasksToCreate = selectedSubtasks.value.map(title => ({ title }));
  isAiLoading.value = true;

  const createdTasks = await createSubTasks(props.taskId, tasksToCreate);

  isAiLoading.value = false;

  if (createdTasks && createdTasks.length > 0) {
    // TODO: Replace with a proper toast notification
    alert(`${createdTasks.length} subtasks created successfully!`);
    dismissInteractiveResponse();
    // Emit event to notify parent component (e.g., the Kanban board) to refresh
    emit('tasks-updated');
    emit('close'); // Close modal after successful creation
  } else {
    // TODO: Replace with a proper toast notification
    alert('Error: Could not create subtasks.');
  }
}

function handlePresetPrompt(promptType) {
  if (!taskData.value) return;
  const { title, description } = taskData.value;
  let finalPrompt = '';

  // These prompts are now simpler, as the main instructions are in the backend.
  // We just need to provide the context (title, description) and the intent.
  const taskContext = `Task Title: "${title}". Description: "${description || 'No description'}"`;

  switch (promptType) {
    case 'Декомпозиция':
      finalPrompt = `Decompose this task into subtasks. Context: ${taskContext}`;
      break;
    case 'Анализ рисков':
      finalPrompt = `Analyze the risks for this task. Context: ${taskContext}`;
      break;
    case 'User Story':
      finalPrompt = `Generate a User Story and Acceptance Criteria for this task. Context: ${taskContext}`;
      break;
    case 'Отчет о прогрессе':
        finalPrompt = `Generate a progress report for this task. Context: ${taskContext}`;
        break;
  }

  if (finalPrompt) {
    handleAiPrompt(finalPrompt);
  }
}

async function fetchTask() {
  if (!props.taskId) return;
  taskData.value = await getTaskById(props.taskId);
  // Also fetch related data
  if (taskData.value) {
    fetchChecklist();
    fetchAiHistory();
  }
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

/* AI Assistant Styles */
.ai-assistant-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 50vh; /* Give it a fixed height to contain the chat */
}

.prompt-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.prompt-buttons button {
  background-color: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 8px 15px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.prompt-buttons button:hover {
  background-color: #e0e0e0;
}

.chat-history {
  flex-grow: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 15px;
  overflow-y: auto;
  background-color: #f9f9f9;
}

.message {
  margin-bottom: 12px;
  padding: 10px 15px;
  border-radius: 18px;
  max-width: 80%;
  line-height: 1.5;
}

.message.assistant {
  background-color: #e9ecef;
  color: #333;
  align-self: flex-start;
}

.message.user {
  background-color: #007bff;
  color: white;
  align-self: flex-end;
  margin-left: auto;
}

.chat-input {
  display: flex;
  gap: 10px;
}

.chat-input input {
  flex-grow: 1;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 10px 15px;
  font-size: 1em;
}

.chat-input button {
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.chat-input button:hover {
  background-color: #0056b3;
}

/* Interactive AI Response Styles */
.ai-interactive-response {
  border: 1px solid #007bff;
  border-radius: 8px;
  margin-bottom: 15px;
  background-color: #f0f7ff;
}

.interactive-header {
  padding: 10px 15px;
  border-bottom: 1px solid #bce0ff;
}

.interactive-header h4 {
  margin: 0;
  color: #004085;
}

.subtask-list {
  list-style-type: none;
  padding: 10px 15px;
  margin: 0;
  max-height: 150px;
  overflow-y: auto;
}

.subtask-item {
  display: flex;
  align-items: center;
  padding: 5px 0;
}

.subtask-item input[type="checkbox"] {
  margin-right: 10px;
}

.subtask-item label {
  cursor: pointer;
}

.interactive-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 15px;
  border-top: 1px solid #bce0ff;
  background-color: #e6f2ff;
}

.interactive-actions button {
  padding: 8px 15px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: bold;
}

.interactive-actions .create-btn {
  background-color: #28a745;
  color: white;
}

.interactive-actions .create-btn:disabled {
  background-color: #a3d9b1;
  cursor: not-allowed;
}

.interactive-actions .dismiss-btn {
  background-color: #6c757d;
  color: white;
}
</style>
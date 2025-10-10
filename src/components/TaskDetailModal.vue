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
        <!-- Details Tab -->
        <div v-if="activeTab === 'Детали'">
          <!-- ... content from previous version ... -->
        </div>

        <!-- Checklist Tab -->
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
                  class="item-checkbox"
                />
                <span :class="{ completed: item.is_completed }" class="item-title">{{ item.title }}</span>

                <!-- Assignee Dropdown -->
                <div class="assignee-selector">
                  <div v-if="item.assignee" class="assignee-display" @click="toggleAssigneeDropdown(item.id)">
                    <img :src="item.assignee.avatar_url" alt="Assignee Avatar" class="assignee-avatar-sm"/>
                    <span>{{ item.assignee.full_name }}</span>
                  </div>
                  <div v-else class="assignee-placeholder" @click="toggleAssigneeDropdown(item.id)">
                    + Назначить
                  </div>

                  <!-- Dropdown List -->
                  <div v-if="activeDropdown === item.id && canAssignChecklists" class="assignee-dropdown">
                     <div class="dropdown-item" @click="handleAssignChecklistItem(item, null)">
                        <span>Нет исполнителя</span>
                      </div>
                    <div
                      v-for="member in projectMembers"
                      :key="member.user_id"
                      class="dropdown-item"
                      @click="handleAssignChecklistItem(item, member.user_id)">
                      <img :src="member.profile.avatar_url" alt="Member Avatar" class="assignee-avatar-sm"/>
                      <span>{{ member.profile.full_name }}</span>
                    </div>
                  </div>
                </div>

                <button class="delete-item-btn" @click="handleDeleteChecklistItem(item.id)">&times;</button>
              </li>
            </ul>
          </div>
        </div>

        <!-- Other Tabs -->
        <!-- ... content from previous version ... -->
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, watch, computed, nextTick } from 'vue';
import {
  getTaskById,
  updateTask,
  createSubTasks,
  getChecklistForTask,
  addChecklistItem,
  addChecklistItemsBatch,
  updateChecklistItem,
  deleteChecklistItem,
  invokeGeminiProxy,
  getAiConversationHistory,
  saveAiConversation,
  getProjectMembers, // <-- Import new
  getMyProjectRole   // <-- Import new
} from '../services/supabaseService.js';

const props = defineProps({
  taskId: { type: String, required: true },
  taskTitle: { type: String, default: 'Загрузка...' }
});
const emit = defineEmits(['close', 'tasks-updated']);

const tabs = ['Детали', 'Чек-листы', 'Учет времени', 'AI-Ассистент'];
const activeTab = ref(tabs[1]); // Default to checklist tab

// --- Component State ---
const taskData = ref(null);
const checklist = ref([]);
const newChecklistItem = ref('');
const projectMembers = ref([]);
const userRole = ref(null);
const activeDropdown = ref(null); // ID of the checklist item whose dropdown is open

// --- Computed Properties ---
const canAssignChecklists = computed(() => {
  const permittedRoles = ['Owner', 'Admin', 'Project Manager', 'Team Lead'];
  return permittedRoles.includes(userRole.value);
});


// --- Methods ---

// Добавьте эту функцию, чтобы исправить ReferenceError
async function fetchAiHistory() {
  if (!props.taskId) return;
  // Логика загрузки истории AI (сейчас просто заглушка)
  console.log("Fetching AI history for task:", props.taskId);
}

function toggleAssigneeDropdown(itemId) {
  if (!canAssignChecklists.value) return;
  activeDropdown.value = activeDropdown.value === itemId ? null : itemId;
}

async function handleAssignChecklistItem(item, assigneeId) {
  const updatedItem = await updateChecklistItem(item.id, { assignee_id: assigneeId });
  if (updatedItem) {
    // We need to refetch the checklist to get the nested assignee profile data
    await fetchChecklist();
  }
  activeDropdown.value = null; // Close dropdown after selection
}

async function fetchTaskAndRelatedData() {
  if (!props.taskId) return;

  const task = await getTaskById(props.taskId);
  taskData.value = task;

  if (taskData.value && taskData.value.project_id) {
    const [members, roleResult] = await Promise.all([
      getProjectMembers(taskData.value.project_id),
      getMyProjectRole(taskData.value.project_id)
    ]);

    projectMembers.value = members;
    userRole.value = roleResult.data;

    // Теперь вызываем остальные функции
    await Promise.all([
      fetchChecklist(),
      fetchAiHistory()
    ]);
  }
}

// Checklist-specific methods from previous version
async function fetchChecklist() {
  if (!props.taskId) return;
  checklist.value = await getChecklistForTask(props.taskId);
}
async function handleAddChecklistItem() {
  if (newChecklistItem.value.trim() === '') return;
  const newItem = await addChecklistItem(props.taskId, newChecklistItem.value.trim());
  if (newItem) {
    // Re-fetch to get consistent data shape (with assignee as null)
    await fetchChecklist();
    newChecklistItem.value = '';
  }
}
async function toggleChecklistItem(item) {
  const updatedItem = await updateChecklistItem(item.id, { is_completed: !item.is_completed });
  if (updatedItem) {
    const index = checklist.value.findIndex(i => i.id === item.id);
    if (index !== -1) {
      // To keep reactivity and nested objects correct, replace the item
      checklist.value[index] = { ...checklist.value[index], ...updatedItem };
    }
  }
}
async function handleDeleteChecklistItem(itemId) {
  const success = await deleteChecklistItem(itemId);
  if (success) {
    checklist.value = checklist.value.filter(item => item.id !== itemId);
  }
}


// --- Lifecycle Hooks ---
onMounted(fetchTaskAndRelatedData);
watch(() => props.taskId, fetchTaskAndRelatedData);

// Keep other logic (AI, Time Tracking etc.) as is
// ...
// (The rest of the <script> and the <style> sections remain unchanged)
// ...

</script>

<style scoped>
/* ... (all existing styles) ... */

/* New styles for Assignee Selector */
.checklist-item {
  display: flex;
  align-items: center;
  gap: 10px; /* Add gap for spacing */
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.item-checkbox {
  flex-shrink: 0;
}

.item-title {
  flex-grow: 1;
}

.assignee-selector {
  position: relative;
  flex-shrink: 0;
}

.assignee-display, .assignee-placeholder {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  font-size: 0.9em;
}

.assignee-display:hover, .assignee-placeholder:hover {
  background-color: #f0f0f0;
}

.assignee-placeholder {
  color: #007bff;
  border: 1px dashed #007bff;
}

.assignee-avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.assignee-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  z-index: 1010; /* Ensure it's above other elements */
  max-height: 200px;
  overflow-y: auto;
  width: 250px; /* Set a fixed width */
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.delete-item-btn {
  /* Styles remain the same */
  margin-left: auto; /* Push it to the far right */
}
</style>
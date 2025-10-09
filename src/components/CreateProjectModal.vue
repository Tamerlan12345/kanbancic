<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Новый проект</h2>
        <button class="close-button" @click="close">&times;</button>
      </div>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="project-name">Название проекта</label>
          <input id="project-name" v-model="project.name" type="text" required>
        </div>
        <div class="form-group">
          <label for="project-description">Описание</label>
          <textarea id="project-description" v-model="project.description"></textarea>
        </div>
        <div class="form-group">
          <label for="project-workspace">Рабочее пространство</label>
          <select id="project-workspace" v-model="project.workspace_id" required>
            <option disabled value="">Выберите пространство</option>
            <option v-for="ws in workspaces" :key="ws.id" :value="ws.id">
              {{ ws.name }}
            </option>
          </select>
        </div>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="close">Отмена</button>
          <button type="submit" class="btn-primary" :disabled="isSubmitting">
            {{ isSubmitting ? 'Создание...' : 'Создать проект' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getWorkspaces, createProject } from '../services/supabaseService';

const emit = defineEmits(['close', 'project-created']);
const project = ref({
  name: '',
  description: '',
  workspace_id: '',
});
const workspaces = ref([]);
const isSubmitting = ref(false);
const errorMessage = ref('');

onMounted(async () => {
  workspaces.value = await getWorkspaces();
});

const handleSubmit = async () => {
  isSubmitting.value = true;
  errorMessage.value = '';
  const { data, error } = await createProject(project.value);
  isSubmitting.value = false;

  if (error) {
    errorMessage.value = `Ошибка: ${error.message}`;
  } else {
    emit('project-created', data);
    close();
  }
};

const close = () => {
  emit('close');
};
</script>

<style scoped>
.modal-backdrop {
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
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  width: 90%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.75rem;
  cursor: pointer;
  color: #888;
}

form {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}

.error-message {
  color: #d9534f;
  background-color: #f2dede;
  border: 1px solid #ebccd1;
  border-radius: 4px;
  padding: 10px;
  margin-top: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e0e0e0;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:disabled {
  background-color: #a0d3ff;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #f0f0f0;
  color: #333;
  border: 1px solid #ccc;
}
</style>
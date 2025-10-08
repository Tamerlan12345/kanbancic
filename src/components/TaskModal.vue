<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <h2>Создать новую задачу</h2>
        <button class="close-button" @click="$emit('close')">&times;</button>
      </header>
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="task-name">Название задачи</label>
          <input id="task-name" v-model="task.name" type="text" required placeholder="Например, 'Исправить ошибку аутентификации'">
        </div>
        <div class="form-group">
          <label for="task-description">Описание</label>
          <textarea id="task-description" v-model="task.description" rows="4" placeholder="Подробное описание задачи..."></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="task-status">Статус</label>
            <select id="task-status" v-model="task.status" required>
              <option value="Backlog">Бэклог</option>
              <option value="To Do">К выполнению</option>
              <option value="In Progress">В работе</option>
              <option value="Done">Готово</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-priority">Приоритет</label>
            <select id="task-priority" v-model="task.priority" required>
              <option value="Low">Низкий</option>
              <option value="Medium">Средний</option>
              <option value="High">Высокий</option>
              <option value="Urgent">Срочный</option>
            </select>
          </div>
          <div class="form-group">
            <label for="task-type">Тип задачи</label>
            <select id="task-type" v-model="task.issue_type" required>
              <option value="Task">Задача</option>
              <option value="Bug">Ошибка</option>
              <option value="Feature">Фича</option>
            </select>
          </div>
        </div>
        <footer class="modal-footer">
          <button type="button" class="button-secondary" @click="$emit('close')">Отмена</button>
          <button type="submit" class="button-primary">Создать задачу</button>
        </footer>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const emit = defineEmits(['close', 'save']);

const task = ref({
  name: '',
  description: '',
  status: 'Backlog',
  priority: 'Medium',
  issue_type: 'Task',
});

const handleSubmit = () => {
  // TODO: Add validation
  emit('save', { ...task.value });
};
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
  max-width: 600px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #e0e0e0;
}
.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
}
.close-button {
  background: none;
  border: none;
  font-size: 2em;
  cursor: pointer;
  color: #888;
}
form {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.form-row {
  display: flex;
  gap: 15px;
}
.form-row .form-group {
  flex: 1;
}
.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}
.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1em;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #e0e0e0;
}
.button-primary, .button-secondary {
  padding: 10px 20px;
  border-radius: 4px;
  border: none;
  font-size: 1em;
  cursor: pointer;
}
.button-primary {
  background-color: #007bff;
  color: white;
}
.button-secondary {
  background-color: #f0f0f0;
  color: #333;
}
</style>
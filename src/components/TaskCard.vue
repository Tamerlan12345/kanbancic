<template>
  <div class="kanban-task" :data-task-id="task.id" @click="handleClick">
    <p class="task-title">{{ task.title }}</p>
    <span class="task-priority">{{ task.priority }}</span>
    <div v-if="task.children && task.children.length > 0" class="child-tasks">
      <!-- Recursive component invocation -->
      <TaskCard v-for="child in task.children" :key="child.id" :task="child" />
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';

// Define the component's props. The 'task' prop is expected to be an object.
const props = defineProps({
  task: {
    type: Object,
    required: true
  }
});

// Define the custom event that this component can emit.
const emit = defineEmits(['view-task']);

// When the card is clicked, emit the 'view-task' event with the task's ID.
function handleClick() {
  // We only want to open the modal for top-level tasks, not nested ones.
  // This can be improved later if sub-tasks need their own detail views.
  if (props.task.parent_id === null) {
      emit('view-task', props.task);
  }
}
</script>

<style scoped>
/* Scoped styles for the TaskCard component */
.kanban-task {
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
  cursor: grab;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.task-title {
  font-weight: bold;
  margin: 0 0 5px 0;
}

.task-priority {
  font-size: 0.8em;
  color: #666;
}

.child-tasks {
  margin-top: 10px;
  padding-left: 15px;
  border-left: 2px solid #eee;
}
</style>
<template>
  <div class="task-card" :data-task-id="task.id" @click="handleClick">
    <div class="card-header">
      <span
        v-if="task.issue_type"
        class="tag issue-type-tag"
        :style="{ backgroundColor: task.issue_type.color }">
        {{ task.issue_type.name }}
      </span>
      <span :class="['tag', 'priority-tag', `priority-${task.priority.toLowerCase()}`]">
        {{ task.priority }}
      </span>
    </div>

    <p class="task-title">{{ task.title }}</p>

    <div class="card-footer">
      <div class="assignee-avatar">
        <img v-if="task.assignee?.avatar_url" :src="task.assignee.avatar_url" alt="Assignee" />
        <span v-else class="initials-avatar">?</span>
      </div>
      <div class="actions">
        <span class="action-icon">✏️</span>
        <span class="action-icon">🤖</span>
      </div>
    </div>

    <div v-if="task.children && task.children.length > 0" class="child-tasks">
      <!-- Recursive component invocation -->
      <TaskCard v-for="child in task.children" :key="child.id" :task="child" @view-task="$emit('view-task', $event)"/>
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
.task-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s, transform 0.2s;
  cursor: pointer;
  border-left: 4px solid transparent; /* Default border */
}

.task-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.task-card:hover .actions {
  opacity: 1;
}

.card-header {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.tag {
  font-size: 0.75em;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  color: #fff;
  text-transform: uppercase;
}

.issue-type-tag {
  background-color: #808080; /* Default color */
}

.priority-tag.priority-highest { background-color: #d92d20; }
.priority-tag.priority-high { background-color: #f56c2d; }
.priority-tag.priority-medium { background-color: #fbbd08; color: #333; }
.priority-tag.priority-low { background-color: #21ba45; }
.priority-tag.priority-lowest { background-color: #2185d0; }

.task-title {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.assignee-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  overflow: hidden;
}

.assignee-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initials-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: #e0e0e0;
  color: #555;
  font-weight: bold;
}

.actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-icon {
  font-size: 1.2em;
  color: #888;
}

.child-tasks {
  margin-top: 10px;
  padding-left: 15px;
  border-left: 2px solid #eee;
}
</style>
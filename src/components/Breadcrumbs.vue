<template>
  <nav v-if="breadcrumbs.length > 1" class="breadcrumbs">
    <ol>
      <li v-for="(crumb, index) in breadcrumbs" :key="index">
        <router-link :to="crumb.to" :class="{ disabled: isLast(index) }">
          {{ crumb.text }}
        </router-link>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { getProjectDetails } from '../services/supabaseService.js';

const route = useRoute();
const projectName = ref('Загрузка...');

async function fetchProjectName() {
  if (route.name === 'Kanban' && route.query.projectId) {
    projectName.value = 'Загрузка...'; // Reset on change
    const details = await getProjectDetails(route.query.projectId);
    projectName.value = details ? details.name : 'Неизвестный проект';
  }
}

const breadcrumbs = computed(() => {
  const crumbs = [{ text: 'Дэшборд', to: '/dashboard' }];

  if (route.name === 'Kanban') {
    crumbs.push({ text: projectName.value, to: route.fullPath });
  }

  return crumbs;
});

const isLast = (index) => {
  return index === breadcrumbs.value.length - 1;
};

watch(() => route.fullPath, fetchProjectName, { immediate: true });
onMounted(fetchProjectName);
</script>

<style scoped>
.breadcrumbs {
  padding: 15px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.breadcrumbs ol {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 8px;
  align-items: center;
}

.breadcrumbs li::after {
  content: '>';
  margin-left: 8px;
  color: #6c757d;
}

.breadcrumbs li:last-child::after {
  content: '';
}

.breadcrumbs a {
  text-decoration: none;
  color: #007bff;
}

.breadcrumbs a:hover {
  text-decoration: underline;
}

.breadcrumbs a.disabled {
  color: #343a40;
  pointer-events: none;
}
</style>
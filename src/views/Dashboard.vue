<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>Your Projects</h1>
      <p>Select a project to view its Kanban board.</p>
    </header>
    <div v-if="isLoading" class="loading-spinner">
      Loading projects...
    </div>
    <div v-else-if="projects.length === 0" class="no-projects">
      <p>You are not a member of any projects yet.</p>
      <p>Create your first project in the admin panel.</p>
    </div>
    <div v-else class="projects-grid">
      <router-link v-for="project in projects" :key="project.id" :to="`/kanban?projectId=${project.id}`" class="project-card-link">
        <div class="project-card">
          <h2 class="project-title">{{ project.name }}</h2>
          <p class="project-description">{{ project.description }}</p>
          <span class="project-workspace">{{ project.workspace.name }}</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getProjectsForUser } from '../services/supabaseService.js';

const projects = ref([]);
const isLoading = ref(true);

onMounted(async () => {
  isLoading.value = true;
  projects.value = await getProjectsForUser();
  isLoading.value = false;
});
</script>

<style scoped>
.dashboard-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.dashboard-header {
  text-align: center;
  margin-bottom: 40px;
}

.dashboard-header h1 {
  font-size: 2.5em;
  color: #333;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.project-card-link {
  text-decoration: none;
  color: inherit;
}

.project-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.15);
}

.project-title {
  font-size: 1.5em;
  margin: 0 0 10px 0;
}

.project-description {
  flex-grow: 1;
  color: #666;
  margin-bottom: 15px;
}

.project-workspace {
  align-self: flex-end;
  font-size: 0.9em;
  color: #999;
  background-color: #f5f5f5;
  padding: 3px 8px;
  border-radius: 4px;
}

.loading-spinner, .no-projects {
  text-align: center;
  font-size: 1.2em;
  color: #888;
  margin-top: 50px;
}
</style>
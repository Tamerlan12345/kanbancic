<template>
  <div class="settings-container">
    <Breadcrumbs :items="breadcrumbItems" />
    <h1>Настройки проекта</h1>
    <div class="tabs">
      <button class="tab-button active">Участники</button>
      <!-- Future tabs like "General", "Integrations" can go here -->
    </div>
    <div class="members-management">
      <div v-if="canManageMembers" class="invite-section">
        <input v-model="inviteEmail" type="email" placeholder="Email нового участника" />
        <button @click="handleInvite" :disabled="isInviting">
          {{ isInviting ? 'Отправка...' : 'Пригласить' }}
        </button>
      </div>
      <div v-if="inviteError" class="error-message">{{ inviteError }}</div>
      <div v-if="isLoading" class="loading-spinner">Загрузка участников...</div>
      <div v-else class="members-list">
        <table>
          <thead>
            <tr>
              <th>Участник</th>
              <th>Роль</th>
              <th v-if="canManageMembers">Действия</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in members" :key="member.user_id">
              <td>
                <div class="user-info">
                  <img :src="member.profile.avatar_url || '/default-avatar.png'" alt="avatar" class="avatar" />
                  <span>{{ member.profile.full_name || member.profile.email }}</span>
                </div>
              </td>
              <td>
                <select v-if="canManageMembers && currentUser.id !== member.user_id" v-model="member.role" @change="updateRole(member)">
                  <option v-for="role in availableRoles" :key="role" :value="role">{{ role }}</option>
                </select>
                <span v-else>{{ member.role }}</span>
              </td>
              <td v-if="canManageMembers">
                <button v-if="currentUser.id !== member.user_id" class="btn-danger" @click="removeMember(member)">
                  Удалить
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getProjectMembers, inviteProjectMember, updateProjectMemberRole, removeProjectMember, getMyProjectRole } from '../services/supabaseService';
import { useAuth } from '../composables/useAuth';
import Breadcrumbs from '../components/Breadcrumbs.vue';

const route = useRoute();
const { user: currentUser } = useAuth();
const projectId = route.params.id;

const members = ref([]);
const isLoading = ref(true);
const inviteEmail = ref('');
const isInviting = ref(false);
const inviteError = ref('');
const userProjectRole = ref(null);

const availableRoles = ['Admin', 'Project Manager', 'Team Lead', 'Member', 'Observer'];

const breadcrumbItems = computed(() => [
  { text: 'Проекты', to: '/' },
  // In a real app, you'd fetch the project name
  { text: 'Настройки проекта', to: `/projects/${projectId}/settings`, active: true },
]);

const canManageMembers = computed(() => {
  return userProjectRole.value === 'Owner' || userProjectRole.value === 'Admin';
});

const fetchMembers = async () => {
  isLoading.value = true;
  members.value = await getProjectMembers(projectId);
  isLoading.value = false;
};

const fetchUserRole = async () => {
  // This function needs to be implemented in supabaseService
  const { data: role } = await getMyProjectRole(projectId);
  userProjectRole.value = role;
};

onMounted(async () => {
  await fetchUserRole();
  await fetchMembers();
});

const handleInvite = async () => {
  if (!inviteEmail.value) return;
  isInviting.value = true;
  inviteError.value = '';
  const { data, error } = await inviteProjectMember(projectId, inviteEmail.value);
  if (error) {
    inviteError.value = error.message;
  } else {
    members.value.push(data);
    inviteEmail.value = '';
  }
  isInviting.value = false;
};

const updateRole = async (member) => {
  await updateProjectMemberRole(projectId, member.user_id, member.role);
  // Optionally show a success notification
};

const removeMember = async (member) => {
  if (confirm(`Вы уверены, что хотите удалить ${member.profile.full_name || member.profile.email}?`)) {
    const { error } = await removeProjectMember(projectId, member.user_id);
    if (error) {
      alert(`Ошибка: ${error.message}`);
    } else {
      members.value = members.value.filter(m => m.user_id !== member.user_id);
    }
  }
};
</script>

<style scoped>
.settings-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
.tabs { margin-bottom: 20px; border-bottom: 1px solid #ccc; }
.tab-button { padding: 10px 20px; background: none; border: none; cursor: pointer; font-size: 1rem; }
.tab-button.active { border-bottom: 2px solid #007bff; font-weight: bold; }
.invite-section { display: flex; gap: 10px; margin-bottom: 20px; }
.invite-section input { flex-grow: 1; padding: 8px; border: 1px solid #ccc; border-radius: 4px; }
.members-list table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 12px; border-bottom: 1px solid #eee; }
th { background-color: #f8f8f8; }
.user-info { display: flex; align-items: center; gap: 10px; }
.avatar { width: 32px; height: 32px; border-radius: 50%; }
.btn-danger { color: #d9534f; background: none; border: none; cursor: pointer; }
.error-message { color: #d9534f; margin-bottom: 15px; }
</style>
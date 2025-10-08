<template>
  <div id="app-container">
    <header class="app-header">
      <nav>
        <router-link to="/" class="brand">Quantum PM</router-link>
        <div class="nav-links">
          <template v-if="user">
            <span>{{ user.email }}</span>
            <button @click="handleLogout" class="logout-button">Выйти</button>
          </template>
          <template v-else>
            <router-link to="/login">Вход</router-link>
            <router-link to="/signup">Регистрация</router-link>
          </template>
        </div>
      </nav>
    </header>
    <Breadcrumbs />
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuth } from './composables/useAuth';
import Breadcrumbs from './components/Breadcrumbs.vue';

const { user, signOut } = useAuth();
const router = useRouter();

const handleLogout = async () => {
  try {
    await signOut();
    router.push('/login');
  } catch (error) {
    console.error('Error logging out:', error);
  }
};
</script>

<style>
/* Global Styles */
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  margin: 0;
  background-color: #f9f9f9;
  color: #333;
}

#app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* Header Styles */
.app-header {
  background-color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  padding: 0 20px;
}

.app-header nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.brand {
  font-size: 1.5em;
  font-weight: bold;
  text-decoration: none;
  color: #333;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.nav-links a {
  text-decoration: none;
  color: #007bff;
}

.nav-links span {
  color: #555;
}

.logout-button {
  background-color: transparent;
  border: 1px solid #007bff;
  color: #007bff;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
}

.logout-button:hover {
  background-color: #007bff;
  color: white;
}

/* Main Content Area */
.app-main {
  flex-grow: 1;
  /* Let individual views handle their own padding */
}

/* Transition Styles */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
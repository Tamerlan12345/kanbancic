// src/router/index.js

import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import Home from '../views/Home.vue'; // <-- This is now the Kanban board view
import Login from '../views/Login.vue';
import Signup from '../views/Signup.vue';
import Dashboard from '../views/Dashboard.vue'; // <-- Import our new dashboard
import ProjectSettings from '../views/ProjectSettings.vue';

const routes = [
  {
    path: '/',
    name: 'Root',
    // Redirect from the root path directly to the dashboard
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/projects/:id/settings',
    name: 'ProjectSettings',
    component: ProjectSettings,
    meta: { requiresAuth: true }
  },
  {
    // Change the path to be more descriptive
    path: '/kanban',
    name: 'Kanban',
    component: Home,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/signup',
    name: 'Signup',
    component: Signup
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Guard
router.beforeEach((to, from, next) => {
  const { user } = useAuth();
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  if (requiresAuth && !user.value) {
    next({ name: 'Login' });
  } else if ((to.name === 'Login' || to.name === 'Signup') && user.value) {
    // After logging in, redirect to the dashboard, not the home page
    next({ name: 'Dashboard' });
  } else {
    next();
  }
});

export default router;
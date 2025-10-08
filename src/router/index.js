import { createRouter, createWebHistory } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import Signup from '../views/Signup.vue';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true } // This route requires authentication
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
  // Get the reactive 'user' object from the composable.
  // Note: We call useAuth() outside the guard to get access to its reactive state.
  const { user } = useAuth();

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);

  // If the user is not logged in and the route requires authentication,
  // redirect them to the login page.
  if (requiresAuth && !user.value) {
    next({ name: 'Login' });
  }
  // If the user is already logged in and tries to access login or signup,
  // redirect them to the home page.
  else if ((to.name === 'Login' || to.name === 'Signup') && user.value) {
    next({ name: 'Home' });
  }
  // Otherwise, allow the navigation.
  else {
    next();
  }
});

export default router;
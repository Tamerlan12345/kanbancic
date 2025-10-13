import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { initializeAuth } from './composables/useAuth';
import './services/supabaseService.js'; // Ensures Supabase is initialized first

// --- App Initialization ---
// We must ensure that the authentication state is loaded *before* the
// app is mounted. This prevents the "flicker" where the app briefly
// thinks the user is logged out while the session is being fetched.

async function startup() {
  // 1. Initialize authentication. This will check for an existing session.
  await initializeAuth();

  // 2. Create and mount the Vue app.
  const app = createApp(App);
  app.use(router);
  app.mount('#app');
}

startup();
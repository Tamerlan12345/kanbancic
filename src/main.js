import { createApp } from 'vue';
import App from './App.vue';
import { initSupabase } from './services/supabaseService.js';

/**
 * Initializes the application.
 * This function ensures that any asynchronous setup, like initializing Supabase,
 * is completed before the Vue application is mounted.
 */
async function initializeAndMountApp() {
  // First, initialize the Supabase client.
  // This will handle loading the configuration safely.
  await initSupabase();

  // Once initialization is complete, create and mount the root Vue app.
  createApp(App).mount('#app');
}

// Start the application initialization process.
initializeAndMountApp();
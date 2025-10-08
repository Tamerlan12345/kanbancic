import { createApp } from 'vue';
import App from './App.vue';

// By importing the service, we ensure the Supabase client is initialized.
// The logic inside supabaseService.js runs once when the module is imported.
import './services/supabaseService.js';

import router from './router';

// Create and mount the root Vue app.
const app = createApp(App);
app.use(router);
app.mount('#app');
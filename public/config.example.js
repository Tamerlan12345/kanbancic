// WARNING: DO NOT COMMIT THIS FILE WITH REAL CREDENTIALS
// This is a template for your local configuration.
// 1. Rename this file to `config.js`.
// 2. Replace the placeholders with your actual credentials.
// The `config.js` file is listed in `.gitignore` to prevent it from being committed.

export const APP_CONFIG = {
    // Replace with your actual Supabase project URL.
    SUPABASE_URL: 'YOUR_SUPABASE_URL',

    // Replace with your actual Supabase anon key.
    // This key is safe to be publicly exposed in a browser environment.
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

    // Replace with your actual Google AI (Gemini) API key.
    // IMPORTANT: This key should be treated as a secret and NOT be exposed on the client-side in a production environment.
    // For development, it's here for convenience, but for production, you should use a backend proxy or serverless function
    // to protect this key.
    GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY'
};
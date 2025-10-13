import { ref } from 'vue';
import { supabase } from '../services/supabaseService';
import { useLogger } from './useLogger';

const { error: logError } = useLogger();

// These refs are module-level state, making them singletons.
const user = ref(null);
const session = ref(null);
const isAuthInitialized = ref(false); // New state to track initialization

/**
 * Initializes the authentication state. It fetches the current session
 * and sets up a listener for any subsequent auth state changes.
 */
export const initializeAuth = async () => {
  // Prevent re-initialization
  if (isAuthInitialized.value) return;

  // IMPORTANT FIX: Check if the Supabase client exists before using it.
  if (!supabase) {
    console.error("Critical Error: Supabase client is not initialized. Check your .env.local file. Auth functions will be disabled.");
    isAuthInitialized.value = true; // Mark as initialized to not block the app
    return;
  }

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logError('Error getting session', error);
      return;
    }

    session.value = data.session;
    user.value = data.session?.user || null;

    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user || null;
    });

  } catch (error) {
    logError('Error initializing auth', error);
  } finally {
    isAuthInitialized.value = true; // Signal that auth check is complete
  }
};

/**
 * The main composable function for authentication.
 * Provides authentication methods and reactive state.
 */
export function useAuth() {
  /**
   * Signs up a new user.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   */
  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  };

  /**
   * Signs in an existing user.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // FIX: Manually update state to prevent race conditions with the router guard.
    user.value = data.user;
    session.value = data.session;

    return data;
  };

  /**
   * Signs out the current user.
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return {
    user,
    session,
    signUp,
    signIn,
    signOut,
  };
}
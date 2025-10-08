import { ref } from 'vue';
import { supabase } from '../services/supabaseService';
import { useLogger } from './useLogger';

const { error: logError } = useLogger();

// These refs are module-level state, making them singletons.
// Any component that imports and uses `useAuth` will share this state.
const user = ref(null);
const session = ref(null);

/**
 * Initializes the authentication state. It fetches the current session
 * and sets up a listener for any subsequent auth state changes.
 * This function is called automatically when this module is first imported.
 */
const initializeAuth = async () => {
  try {
    // Fetch the initial session from Supabase.
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      logError('Error getting session', error);
      return;
    }

    // Set the initial state.
    session.value = data.session;
    user.value = data.session?.user || null;

    // Listen for real-time authentication events (e.g., SIGN_IN, SIGN_OUT).
    supabase.auth.onAuthStateChange((_event, newSession) => {
      session.value = newSession;
      user.value = newSession?.user || null;
    });

  } catch (error) {
    logError('Error initializing auth', error);
  }
};

// Run the initialization logic once.
initializeAuth();

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
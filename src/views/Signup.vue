<template>
  <div class="auth-container">
    <h1>Sign Up</h1>
    <form @submit.prevent="handleSignup">
      <div class="form-group">
        <label for="email">Email</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Signing up...' : 'Sign Up' }}
      </button>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </form>
    <p>
      Already have an account? <router-link to="/login">Login</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);
const router = useRouter();
const { signUp } = useAuth();

const handleSignup = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    await signUp(email.value, password.value);
    successMessage.value = 'Success! Please check your email to confirm your account.';
    // We don't redirect immediately, as the user needs to confirm their email.
    // A better user experience might be to show a "Check your email" page.
    // For now, we'll just show a message.
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.auth-container {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.form-group {
  margin-bottom: 15px;
}
label {
  display: block;
  margin-bottom: 5px;
}
input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}
button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
.error-message {
  color: red;
  margin-top: 10px;
}
.success-message {
  color: green;
  margin-top: 10px;
}
</style>
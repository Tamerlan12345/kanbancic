<template>
  <div class="auth-container">
    <h1>Регистрация</h1>
    <form @submit.prevent="handleSignup">
      <div class="form-group">
        <label for="email">Электронная почта</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">Пароль</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? 'Регистрация...' : 'Зарегистрироваться' }}
      </button>
      <p v-if="successMessage" class="success-message">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </form>
    <p>
      Уже есть аккаунт? <router-link to="/login">Войти</router-link>
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuth } from '../composables/useAuth';
import { useLogger } from '../composables/useLogger';

const { info: logInfo, error: logError } = useLogger();
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
    // Set success message in Russian for consistency with the UI.
    successMessage.value = 'Регистрация прошла успешно! Пожалуйста, проверьте свою почту для подтверждения, а затем войдите.';
    logInfo('User signup successful, pending email confirmation', { email: email.value });

    // Redirect to the login page after a delay so the user can read the message.
    setTimeout(() => {
      router.push('/login');
    }, 4000); // 4-second delay

  } catch (error) {
    // Provide a user-friendly error message in Russian.
    if (error.message && error.message.includes('User already registered')) {
      errorMessage.value = 'Пользователь с таким email уже зарегистрирован.';
    } else {
      errorMessage.value = `Произошла ошибка: ${error.message || 'Неизвестная ошибка'}`;
    }
    logError('Signup failed', error);
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
<template>
  <div class="login-wrapper">
    <div class="login-box">
      <div class="p-card p-4 shadow-3">
        <h2 class="text-center mb-5">🏫 Elternsprechtag</h2>
        <Message v-if="error" severity="error" class="mb-4">{{ error }}</Message>
        <div class="flex flex-column gap-3">
          <div class="flex flex-column gap-1">
            <label for="email">E-Mail</label>
            <InputText id="email" v-model="email" type="email" placeholder="name@schule.de" />
          </div>
          <div class="flex flex-column gap-1">
            <label for="password">Passwort</label>
            <Password id="password" v-model="password" :feedback="false" toggleMask fluid />
          </div>
          <Button
            label="Anmelden"
            icon="pi pi-sign-in"
            @click="login"
            :loading="loading"
            class="mt-2"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Button from 'primevue/button'
import Message from 'primevue/message'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  error.value = ''
  loading.value = true
  try {
    const res = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error
    } else {
      localStorage.setItem('user', JSON.stringify(data))
      //router.push('/app')
      if (data.role === 'global_admin') {
        router.push('/app/schools')
      } else if (data.role === 'school_admin') {
        router.push('/app/teachers')
      } else {
        router.push('/app/appointments')
      }
    }
  } catch (_err) {
    error.value = 'Server nicht erreichbar'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: #f3f4f6;
  padding: 2rem;
}

.login-box {
  width: 100%;
  max-width: 420px;
}
</style>

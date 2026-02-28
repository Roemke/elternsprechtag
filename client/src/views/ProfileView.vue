<template>
  <div class="flex flex-column gap-4 mt-3 mx-auto" style="max-width: 500px">
    <h2 class="mb-4">Mein Profil</h2>
          <div class="flex flex-column gap-4 mt-3" style="max-width: 500px">

            <!-- Name -->
            <div class="p-card p-4">
              <h3 class="mt-0">Name</h3>
              <div class="flex flex-column gap-3">
                <div class="flex flex-column gap-1">
                  <label>Vorname</label>
                  <InputText v-model="form.first_name" />
                </div>
                <div class="flex flex-column gap-1">
                  <label>Nachname</label>
                  <InputText v-model="form.last_name" />
                </div>
                <Button label="Name speichern" icon="pi pi-check" @click="saveName" :loading="loadingName" />
              </div>
            </div>

            <!-- Passwort -->
            <div class="p-card p-4" v-if="!user?.auth_method || user?.auth_method === 'internal'">
              <h3 class="mt-0">Passwort ändern</h3>
              <div class="flex flex-column gap-3">
                <div class="flex flex-column gap-1">
                  <label>Neues Passwort</label>
                  <Password v-model="newPassword" :feedback="true" toggleMask fluid />
                </div>
                <div class="flex flex-column gap-1">
                  <label>Passwort wiederholen</label>
                  <Password v-model="newPasswordConfirm" :feedback="false" toggleMask fluid />
                </div>
                <Message v-if="passwordError" severity="error">{{ passwordError }}</Message>
                <Button label="Passwort speichern" icon="pi pi-check" @click="savePassword" :loading="loadingPassword" />
              </div>
            </div>

            <!-- Authentifizierung -->
            <div class="p-card p-4">
              <h3 class="mt-0">Anmeldung</h3>
              <div class="flex flex-column gap-3">
                <div class="flex flex-column gap-1">
                  <label>Authentifizierungsmethode</label>
                  <Select v-model="form.auth_method" :options="authMethods"
                    optionLabel="label" optionValue="value" />
                </div>
                <Button label="Speichern" icon="pi pi-check" @click="saveAuthMethod" :loading="loadingAuth" />
              </div>
            </div>

          </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Select from 'primevue/select'
import Message from 'primevue/message'
import { authFetch } from '../utils/api.js'

const user = JSON.parse(localStorage.getItem('user') || 'null')

const form = ref({
  first_name: user?.first_name || '',
  last_name: user?.last_name || '',
  auth_method: user?.auth_method || 'internal',
})

const newPassword = ref('')
const newPasswordConfirm = ref('')
const passwordError = ref('')
const loadingName = ref(false)
const loadingPassword = ref(false)
const loadingAuth = ref(false)


const authMethods = [
  { label: 'Internes Passwort', value: 'internal' },
  { label: 'Microsoft Office365', value: 'office365' },
]

async function saveName() {
  loadingName.value = true
  try {
    const res = await authFetch(`/api/users/${user.id}/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        first_name: form.value.first_name,
        last_name: form.value.last_name,
        email: user.email,
        role: user.role,
        school_id: user.school_id,
      }),
    })
    if (res.ok) {
      // localStorage aktualisieren
      const updated = { ...user, first_name: form.value.first_name, last_name: form.value.last_name }
      localStorage.setItem('user', JSON.stringify(updated))
    }
  } finally {
    loadingName.value = false
  }
}

async function savePassword() {
  passwordError.value = ''
  if (newPassword.value !== newPasswordConfirm.value) {
    passwordError.value = 'Passwörter stimmen nicht überein'
    return
  }
  if (newPassword.value.length < 6) {
    passwordError.value = 'Passwort muss mindestens 6 Zeichen haben'
    return
  }
  loadingPassword.value = true
  try {
    await authFetch(`/api/users/${user.id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password: newPassword.value }),
    })
    newPassword.value = ''
    newPasswordConfirm.value = ''
  } finally {
    loadingPassword.value = false
  }
}

async function saveAuthMethod() {
  loadingAuth.value = true
  try {
    const res = await authFetch(`/api/users/${user.id}/profile`, {
      method: 'PUT',
      body: JSON.stringify({
        first_name: form.value.first_name,
        last_name: form.value.last_name,
        email: user.email,
        role: user.role,
        school_id: user.school_id,
        auth_method: form.value.auth_method,
      }),
    })
    if (res.ok) {
      const updated = { ...user, auth_method: form.value.auth_method }
      localStorage.setItem('user', JSON.stringify(updated))
    }
  } finally {
    loadingAuth.value = false
  }
}




//onMounted(loadMyTeacherEvents)

</script>

<style scoped>
.time-input {
  width: 100px;
}
</style>

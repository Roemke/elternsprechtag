<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Lehrer</h2>
      <div class="flex gap-2">
        <Button
          label="CSV Import"
          icon="pi pi-upload"
          severity="secondary"
          @click="showCsvDialog = true"
        />
        <Button label="Neuer Lehrer" icon="pi pi-plus" @click="showDialog = true" />
      </div>
    </div>

    <DataTable :value="teachers" stripedRows sortMode="multiple">
      <Column header="Name" sortable :sortField="sortName">
        <template #body="{ data }"> {{ data.last_name }}, {{ data.first_name }} </template>
      </Column>
      <Column field="email" header="E-Mail" />
      <Column field="role" header="Rolle" sortable :sortField="(data) => roleLabel(data.role)">
        <template #body="{ data }">
          {{ roleLabel(data.role) }}
        </template>
      </Column>
      <Column
        header="Schule"
        sortable
        :sortField="(data) => schoolName(data.school_id)"
        v-if="user?.role === 'global_admin'"
      >
        <!--
      <Column header="Schule" v-if="user?.role === 'global_admin'"> -->
        <template #body="{ data }">
          {{ schoolName(data.school_id) }}
        </template>
      </Column>
      <Column header="Aktionen" style="width: 120px">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            text
            @click="editTeacher(data)"
            class="mr-1"
          />
          <Button icon="pi pi-trash" severity="danger" text @click="deleteTeacher(data)" />
        </template>
      </Column>
    </DataTable>

    <!-- Neuer Lehrer Dialog -->
    <Dialog v-model:visible="showDialog" header="Neuer Lehrer" modal style="width: 450px">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1" v-if="user?.role === 'global_admin'">
          <label>Schule</label>
          <Select
            v-model="form.school_id"
            :options="schools"
            optionLabel="name"
            optionValue="id"
            placeholder="Schule wählen"
          />
        </div>
        <div class="flex flex-column gap-1">
          <label>Vorname</label>
          <InputText v-model="form.first_name" placeholder="Vorname" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Nachname</label>
          <InputText v-model="form.last_name" placeholder="Nachname" />
        </div>
        <div class="flex flex-column gap-1">
          <label>E-Mail</label>
          <InputText v-model="form.email" type="email" placeholder="name@schule.de" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Rolle</label>
          <Select v-model="form.role" :options="roles" optionLabel="label" optionValue="value" />
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="form.sendEmail" :binary="true" inputId="sendEmail" />
          <label for="sendEmail">Passwort per Email senden</label>
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showDialog = false" />
        <Button label="Speichern" icon="pi pi-check" @click="createTeacher" :loading="loading" />
      </template>
    </Dialog>

    <!-- Edit Lehrer Dialog -->
    <Dialog v-model:visible="showEditDialog" header="Lehrer bearbeiten" modal style="width: 450px">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1" v-if="user?.role === 'global_admin'">
          <label>Schule</label>
          <Select
            v-model="editForm.school_id"
            :options="schools"
            optionLabel="name"
            optionValue="id"
          />
        </div>
        <div class="flex flex-column gap-1">
          <label>Vorname</label>
          <InputText v-model="editForm.first_name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Nachname</label>
          <InputText v-model="editForm.last_name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>E-Mail</label>
          <InputText v-model="editForm.email" type="email" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Rolle</label>
          <Select
            v-model="editForm.role"
            :options="roles"
            optionLabel="label"
            optionValue="value"
          />
        </div>
        <div class="flex flex-column gap-1">
          <label>Neues Passwort</label>
          <small class="text-color-secondary">Leer lassen um Passwort beizubehalten</small>
          <Password v-model="editForm.newPassword" :feedback="false" toggleMask fluid />
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showEditDialog = false" />
        <Button label="Speichern" icon="pi pi-check" @click="saveTeacher" :loading="loading" />
      </template>
    </Dialog>
    <!-- CSV Import Dialog -->
    <Dialog v-model:visible="showCsvDialog" header="CSV Import" modal style="width: 500px">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1" v-if="user?.role === 'global_admin'">
          <label>Schule</label>
          <Select
            v-model="csvSchoolId"
            :options="schools"
            optionLabel="name"
            optionValue="id"
            placeholder="Schule wählen"
          />
        </div>
        <div class="flex flex-column gap-1">
          <label>CSV Datei</label>
          <small class="text-color-secondary"
            >Format: name,email,rolle (eine Zeile pro Lehrer)</small
          >
          <FileUpload
            mode="basic"
            accept=".csv"
            :auto="false"
            @select="onCsvSelect"
            chooseLabel="CSV wählen"
          />
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="csvSendEmail" :binary="true" inputId="csvSendEmail" />
          <label for="csvSendEmail">Passwörter per Email senden</label>
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showCsvDialog = false" />
        <Button label="Importieren" icon="pi pi-upload" @click="importCsv" :loading="loading" />
      </template>
    </Dialog>

    <!-- Passwort Liste nach CSV Import -->
    <Dialog
      v-model:visible="showPasswordList"
      header="Generierte Passwörter"
      modal
      style="width: 500px"
    >
      <DataTable :value="passwordList">
        <Column field="last_name" header="Name" />
        <Column field="first_name" header="Vorname" />
        <Column field="email" header="E-Mail" />
        <Column field="password" header="Passwort" />
      </DataTable>
      <template #footer>
        <Button label="Als CSV herunterladen" icon="pi pi-download" @click="downloadPasswordList" />
        <Button label="Schließen" severity="secondary" @click="showPasswordList = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import FileUpload from 'primevue/fileupload'
import Password from 'primevue/password'
import { authFetch } from '../utils/api.js'

const user = JSON.parse(localStorage.getItem('user') || 'null')
const teachers = ref([])
const schools = ref([])
const showDialog = ref(false)
const showCsvDialog = ref(false)
const showPasswordList = ref(false)
const passwordList = ref([])
const loading = ref(false)
const csvSchoolId = ref(null)
const csvSendEmail = ref(false)
const csvFile = ref(null)

const form = ref({
  school_id: null,
  first_name: '',
  last_name: '',
  email: '',
  role: 'teacher',
  sendEmail: false,
})

const roles = computed(() => {
  const r = [
    { label: 'Lehrer', value: 'teacher' },
    { label: 'Schuladmin', value: 'school_admin' },
  ]
  if (user?.role === 'global_admin') {
    r.push({ label: 'Globaler Admin', value: 'global_admin' })
  }
  return r
})

const showEditDialog = ref(false)
const editForm = ref({
  id: null,
  first_name: '',
  last_name: '',
  email: '',
  role: 'teacher',
  school_id: null,
  newPassword: '',
})

//some Helper functions
function sortName(teacher) {
  return `${teacher.last_name} ${teacher.first_name}`
}
function roleLabel(role) {
  //roles ist jetzt computed, daher value
  return roles.value.find((r) => r.value === role)?.label || role
}

function schoolName(school_id) {
  return schools.value.find((s) => s.id === school_id)?.name || '-'
}

async function loadTeachers() {
  if (user?.role === 'global_admin') {
    const res = await authFetch('/api/users/all')
    teachers.value = await res.json()
  } else {
    const res = await authFetch(`/api/users/school/${user.school_id}`)
    teachers.value = await res.json()
  }
}

async function loadSchools() {
  const res = await authFetch('/api/schools')
  schools.value = await res.json()
}

async function createTeacher() {
  const school_id = user?.role === 'global_admin' ? form.value.school_id : user.school_id
  if (!form.value.first_name || !form.value.last_name || !form.value.email || !form.value.school_id)
    return

  loading.value = true
  try {
    const res = await authFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form.value, school_id }),
    })
    if (res.ok) {
      showDialog.value = false
      form.value = {
        school_id: null,
        first_name: '',
        last_name: '',
        email: '',
        role: 'teacher',
        sendEmail: false,
      }
      await loadTeachers()
    }
  } finally {
    loading.value = false
  }
}

//teacher editieren
function editTeacher(teacher) {
  editForm.value = {
    id: teacher.id,
    first_name: teacher.first_name,
    last_name: teacher.last_name,
    email: teacher.email,
    role: teacher.role,
    school_id: teacher.school_id,
  }
  showEditDialog.value = true
}

async function saveTeacher() {
  loading.value = true
  try {
    const res = await authFetch(`/api/users/${editForm.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm.value),
    })
    if (res.ok) {
      showEditDialog.value = false
      await loadTeachers()
    }
  } finally {
    loading.value = false
  }
}

async function deleteTeacher(teacher) {
  if (!confirm(`Lehrer "${teacher.first_name} ${teacher.last_name}" wirklich löschen?`)) return
  await authFetch(`/api/users/${teacher.id}`, { method: 'DELETE' })
  await loadTeachers()
}

function onCsvSelect(event) {
  csvFile.value = event.files[0]
}

async function importCsv() {
  if (!csvFile.value) return
  const school_id = user?.role === 'global_admin' ? csvSchoolId.value : user.school_id
  loading.value = true
  try {
    const formData = new FormData()
    formData.append('file', csvFile.value)
    formData.append('school_id', school_id)
    formData.append('sendEmail', csvSendEmail.value)
    const res = await authFetch('/api/users/import', {
      method: 'POST',
      body: formData,
    })
    const data = await res.json()
    if (res.ok) {
      showCsvDialog.value = false
      passwordList.value = data.passwords
      showPasswordList.value = true
      await loadTeachers()
    }
  } finally {
    loading.value = false
  }
}

function downloadPasswordList() {
  const csv =
    'Name,Vorname,Email,Passwort\n' +
    passwordList.value
      .map((p) => `${p.last_name},${p.first_name},${p.email},${p.password}`)
      .join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'passwoerter.csv'
  a.click()
}

onMounted(async () => {
  await loadSchools()
  await loadTeachers()
})
</script>

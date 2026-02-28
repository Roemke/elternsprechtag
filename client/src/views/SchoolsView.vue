<template>
  <div>
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Schulen</h2>
      <Button label="Neue Schule" icon="pi pi-plus" @click="showDialog = true" />
    </div>

    <DataTable :value="schools" stripedRows>
      <Column field="id" header="ID" style="width: 80px" />
      <Column field="name" header="Name" />
      <Column field="created_at" header="Erstellt am">
        <template #body="{ data }">
          {{ new Date(data.created_at).toLocaleDateString('de-DE') }}
        </template>
      </Column>
      <Column header="Aktionen" style="width: 120px">
        <template #body="{ data }">
          <Button
            icon="pi pi-pencil"
            severity="secondary"
            text
            @click="editSchool(data)"
            class="mr-1"
          />
          <Button icon="pi pi-trash" severity="danger" text @click="deleteSchool(data)" />
        </template>
      </Column>
    </DataTable>

    <Dialog v-model:visible="showDialog" header="Neue Schule" modal style="width: 400px">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label for="schoolName">Name</label>
          <InputText id="schoolName" v-model="newSchoolName" placeholder="Name der Schule" />
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showDialog = false" />
        <Button label="Speichern" icon="pi pi-check" @click="createSchool" :loading="loading" />
      </template>
    </Dialog>
    <Dialog v-model:visible="showEditDialog" header="Schule bearbeiten" modal style="width: 400px">
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label for="editSchoolName">Name</label>
          <InputText id="editSchoolName" v-model="editSchoolName" />
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showEditDialog = false" />
        <Button label="Speichern" icon="pi pi-check" @click="saveSchool" :loading="loading" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { authFetch } from '../utils/api.js'

//ref: Vue-Syntax, damit die Variable reaktiv ist - aktualisierungen sofort in der UI sichtbar
const schools = ref([])
const showDialog = ref(false)
const newSchoolName = ref('')
const loading = ref(false)

const showEditDialog = ref(false)
const editSchoolName = ref('')
const editSchoolId = ref(null)

async function loadSchools() {
  const res = await authFetch('/api/schools')
  schools.value = await res.json()
}

async function createSchool() {
  if (!newSchoolName.value.trim()) return
  loading.value = true
  try {
    const res = await authFetch('/api/schools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newSchoolName.value }),
    })
    if (res.ok) {
      newSchoolName.value = ''
      showDialog.value = false
      await loadSchools()
    }
  } finally {
    loading.value = false
  }
}

//bearbeitungsfunktionen
function editSchool(school) {
  editSchoolId.value = school.id
  editSchoolName.value = school.name
  showEditDialog.value = true
}

async function saveSchool() {
  loading.value = true
  try {
    const res = await authFetch(`/api/schools/${editSchoolId.value}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editSchoolName.value }),
    })
    if (res.ok) {
      showEditDialog.value = false
      await loadSchools()
    }
  } finally {
    loading.value = false
  }
}

async function deleteSchool(school) {
  if (!confirm(`Schule "${school.name}" wirklich löschen?`)) return
  await authFetch(`/api/schools/${school.id}`, { method: 'DELETE' })
  await loadSchools()
}
onMounted(loadSchools)
</script>

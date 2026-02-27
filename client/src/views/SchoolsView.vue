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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'

const schools = ref([])
const showDialog = ref(false)
const newSchoolName = ref('')
const loading = ref(false)

async function loadSchools() {
  const res = await fetch('/api/schools')
  schools.value = await res.json()
}

async function createSchool() {
  if (!newSchoolName.value.trim()) return
  loading.value = true
  try {
    const res = await fetch('/api/schools', {
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

onMounted(loadSchools)
</script>

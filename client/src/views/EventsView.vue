<template>
  <div>
    <ConfirmDialog />
    <!--Bestätigung für löschen bei saveEvent-->
    <div class="flex justify-content-between align-items-center mb-4">
      <h2 class="m-0">Sprechtage</h2>
      <Button label="Neuer Sprechtag" icon="pi pi-plus" @click="showDialog = true" />
    </div>

    <DataTable :value="events" stripedRows>
      <Column header="Schule" sortable :sortField="(data) => schoolName(data.school_id)">
        <template #body="{ data }">
          {{ schoolName(data.school_id) }}
        </template>
      </Column>
      <Column field="name" header="Name" sortable />
      <Column field="date" header="Datum" sortable>
        <template #body="{ data }">
          {{ new Date(data.date).toLocaleDateString('de-DE') }}
        </template>
      </Column>
      <Column field="time_start" header="Von" />
      <Column field="time_end" header="Bis" />
      <Column field="slot_duration" header="Minuten/Termin" />
      <Column field="active" header="Status">
        <template #body="{ data }">
          <Tag
            :value="data.active ? 'Aktiv' : 'Inaktiv'"
            :severity="data.active ? 'success' : 'secondary'"
          />
        </template>
      </Column>
      <Column header="Aktionen" style="width: 150px">
        <template #body="{ data }">
          <Button
            icon="pi pi-users"
            text
            severity="secondary"
            @click="manageTeachers(data)"
            class="mr-1"
            v-tooltip="'Lehrer verwalten'"
          />
          <Button
            icon="pi pi-pencil"
            text
            severity="secondary"
            @click="editEvent(data)"
            class="mr-1"
          />
          <Button icon="pi pi-trash" text severity="danger" @click="deleteEvent(data)" />
        </template>
      </Column>
    </DataTable>

    <!-- Neuer Sprechtag Dialog -->
    <Dialog v-model:visible="showDialog" header="Neuer Sprechtag" modal style="width: 450px">
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
          <label>Name</label>
          <InputText v-model="form.name" placeholder="z.B. Sprechtag Herbst 2026" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Datum</label>
          <DatePicker v-model="form.date" dateFormat="dd.mm.yy" showIcon />
        </div>
        <div class="flex gap-3">
          <div class="flex flex-column gap-1 flex-1">
            <label>Von</label>
            <InputText v-model="form.time_start" class="time-input" placeholder="15:00" />
          </div>
          <div class="flex flex-column gap-1 flex-1">
            <label>Bis</label>
            <InputText v-model="form.time_end" class="time-input" placeholder="19:00" />
          </div>
        </div>
        <div class="flex flex-column gap-1">
          <label>Minuten pro Termin</label>
          <InputNumber v-model="form.slot_duration" :min="5" :max="60" showButtons />
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showDialog = false" />
        <Button label="Speichern" icon="pi pi-check" @click="createEvent" :loading="loading" />
      </template>
    </Dialog>

    <!-- Edit Dialog -->
    <Dialog
      v-model:visible="showEditDialog"
      header="Sprechtag bearbeiten"
      modal
      style="width: 450px"
    >
      <div class="flex flex-column gap-3 pt-2">
        <div class="flex flex-column gap-1">
          <label>Name</label>
          <InputText v-model="editForm.name" />
        </div>
        <div class="flex flex-column gap-1">
          <label>Datum</label>
          <DatePicker v-model="editForm.date" dateFormat="dd.mm.yy" showIcon />
        </div>
        <div class="flex gap-3">
          <div class="flex flex-column gap-1 flex-1">
            <label>Von</label>
            <InputText v-model="editForm.time_start" class="time-input" />
          </div>
          <div class="flex flex-column gap-1 flex-1">
            <label>Bis</label>
            <InputText v-model="editForm.time_end" class="time-input" />
          </div>
        </div>
        <div class="flex flex-column gap-1">
          <label>Minuten pro Termin</label>
          <InputNumber v-model="editForm.slot_duration" :min="5" :max="60" showButtons />
        </div>
        <div class="flex align-items-center gap-2">
          <Checkbox v-model="editForm.active" :binary="true" inputId="active" />
          <label for="active">Sprechtag aktiv (für Eltern sichtbar)</label>
        </div>
      </div>
      <template #footer>
        <Button label="Abbrechen" severity="secondary" @click="showEditDialog = false" />
        <Button label="Speichern" icon="pi pi-check" @click="saveEvent" :loading="loading" />
      </template>
    </Dialog>

    <!-- Lehrer verwalten Dialog -->
    <Dialog v-model:visible="showTeachersDialog" header="Lehrer verwalten" modal style="width: 90%">
      <DataTable :value="eventTeachers" stripedRows>
        <Column header="Name">
          <template #body="{ data }"> {{ data.last_name }}, {{ data.first_name }} </template>
        </Column>
        <Column header="Von">
          <template #body="{ data }">
            <InputText v-model="data.time_start" size="6" />
          </template>
        </Column>
        <Column header="Bis">
          <template #body="{ data }">
            <InputText v-model="data.time_end" size="6" />
          </template>
        </Column>
        <Column header="Aktiv">
          <template #body="{ data }">
            <!--
              <Checkbox v-model="data.active" :binary="true"
              @change="updateTeacher(data)" />
              so nicht, jeder Wechsel soll erst durch den Speichern Button am Ende bestätigt werden, damit nicht bei jedem Klick ein Request losgeschickt wird
              -->
            <Checkbox
              :modelValue="data.active"
              :binary="true"
              @change="data.active = !data.active"
            />
          </template>
        </Column>
        <Column header="">
          <template #body="{ data }">
            <Button label="Speichern" size="small" @click="updateTeacher(data)" />
          </template>
        </Column>
      </DataTable>
      <template #footer>
        <Button
          label="Alles speichern"
          icon="pi pi-check"
          @click="saveAllTeachers"
          :loading="loading"
        />
        <Button label="Schließen" severity="secondary" @click="showTeachersDialog = false" />
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
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Checkbox from 'primevue/checkbox'
import DatePicker from 'primevue/datepicker'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import ConfirmDialog from 'primevue/confirmdialog'
import { authFetch } from '../utils/api.js'

const confirmD = useConfirm()

const user = JSON.parse(localStorage.getItem('user') || 'null')
const events = ref([])
const schools = ref([])
const eventTeachers = ref([])
const showDialog = ref(false)
const showEditDialog = ref(false)
const showTeachersDialog = ref(false)
const loading = ref(false)
const currentEventId = ref(null)

const form = ref({
  school_id: null,
  name: '',
  date: null,
  time_start: '15:30',
  time_end: '18:30',
  slot_duration: 15,
  active: true,
})

const editForm = ref({
  id: null,
  name: '',
  date: null,
  time_start: '',
  time_end: '',
  slot_duration: 15,
  active: false,
})

//helper
function schoolName(school_id) {
  return schools.value.find((s) => s.id === school_id)?.name || '-'
}

async function loadEvents() {
  const url = user?.role === 'global_admin' ? '/api/events' : `/api/events/school/${user.school_id}`
  const res = await authFetch(url)
  //console.log('Status:', res.status)
  //const text = await res.text()
  //console.log('Response:', text)
  events.value = await res.json()
}

async function loadSchools() {
  const res = await authFetch('/api/schools')
  schools.value = await res.json()
}

async function createEvent() {
  const school_id = user?.role === 'global_admin' ? form.value.school_id : user.school_id
  if (!form.value.name || !form.value.date || !school_id) return
  loading.value = true
  try {
    const res = await authFetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form.value, //alle Werte aus dem Formular und ergänzen, vergesse ... immer gabs früher nicht
        school_id, //aber früher war mehr Lametta
        date: form.value.date ? new Date(form.value.date).toISOString().split('T')[0] : null,
      }),
    })
    if (res.ok) {
      showDialog.value = false
      form.value = {
        school_id: null,
        name: '',
        date: null,
        time_start: '15:30',
        time_end: '18:30',
        slot_duration: 15,
      }
      const eventData = await res.json()
      await authFetch(`/api/slots/generate/${eventData.id}`, { method: 'POST' })
      await loadEvents()
    }
  } finally {
    loading.value = false
  }
}

const originalTime = ref({ time_start: '', time_end: '', slot_duration: 15 }) //speichert die ursprünglichen Zeiten, um zu vergleichen ob sie geändert wurden
function editEvent(event) {
  originalTime.value = {
    time_start: event.time_start,
    time_end: event.time_end,
    slot_duration: event.slot_duration,
  }
  editForm.value = {
    id: event.id,
    name: event.name,
    date: new Date(event.date),
    time_start: event.time_start,
    time_end: event.time_end,
    slot_duration: event.slot_duration,
    active: !!event.active,
  }
  showEditDialog.value = true
}

//speichern ausgelagert
async function doSaveEvent(timesChanged) {
  loading.value = true
  try {
    const res = await authFetch(`/api/events/${editForm.value.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...editForm.value,
        date: editForm.value.date
          ? new Date(editForm.value.date).toISOString().split('T')[0]
          : null,
        timesChanged,
      }),
    })
    if (res.ok) {
      if (timesChanged) {
        await authFetch(`/api/slots/generate/${editForm.value.id}`, { method: 'POST' })
      }
      showEditDialog.value = false
      await loadEvents()
    }
  } finally {
    loading.value = false
  }
}

async function saveEvent() {
  const timesChanged =
    editForm.value.time_start !== originalTime.value.time_start ||
    editForm.value.time_end !== originalTime.value.time_end ||
    editForm.value.slot_duration !== originalTime.value.slot_duration

  if (timesChanged) {
    confirmD.require({
      message: 'Alle bestehenden Slots und Buchungen werden gelöscht. Fortfahren?',
      header: 'Achtung',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Ja, speichern',
      rejectLabel: 'Abbrechen',
      accept: async () => {
        await doSaveEvent(timesChanged) //true
      },
    })
  } else {
    await doSaveEvent(timesChanged) //false
  }
}

async function deleteEvent(event) {
  if (!confirm(`Sprechtag "${event.name}" wirklich löschen?`)) return
  await authFetch(`/api/events/${event.id}`, { method: 'DELETE' })
  await loadEvents()
}

async function saveAllTeachers() {
  loading.value = true
  try {
    for (const teacher of eventTeachers.value) {
      await updateTeacher(teacher)
    }
    showTeachersDialog.value = false
  } finally {
    loading.value = false
  }
}
async function manageTeachers(event) {
  currentEventId.value = event.id
  const res = await authFetch(`/api/events/${event.id}/teachers`)
  const data = await res.json()
  eventTeachers.value = data.map((t) => ({ ...t, active: !!t.active }))
  //überschreiben mit active true/false, damit Checkbox funktioniert, ohne dass die DB geändert werden muss
  showTeachersDialog.value = true
}

async function updateTeacher(teacher) {
  await authFetch(`/api/events/${currentEventId.value}/teacher/${teacher.teacher_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      time_start: teacher.time_start,
      time_end: teacher.time_end,
      active: teacher.active,
    }),
  })
  await authFetch(`/api/slots/generate/${currentEventId.value}/teacher/${teacher.teacher_id}`, {
    method: 'POST',
  })
}

onMounted(async () => {
  await loadSchools()
  await loadEvents()
})
</script>
<style scoped>
.time-input {
  max-width: 180px;
}
</style>

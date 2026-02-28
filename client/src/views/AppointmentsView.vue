<template>
  <div>
    <h2 class="mb-4">Termine</h2>

    <Tabs value="0">
      <TabList>
        <Tab value="0">Meine Termine</Tab>
        <Tab value="1">Meine Verfügbarkeit</Tab>
        <Tab value="2" v-if="user?.role === 'global_admin' || user?.role === 'school_admin'">Alle Termine</Tab>
      </TabList>

      <TabPanels>
        <!-- Tab 1: Meine Termine -->
        <TabPanel value="0">
          <div class="flex flex-column gap-3 mt-3">
            <div class="flex gap-2">
              <Select v-model="selectedEvent" :options="myEvents" optionLabel="name"
                placeholder="Sprechtag wählen" @change="loadMySlots" class="w-full" />
            </div>

            <DataTable v-if="mySlots.length > 0" :value="mySlots" stripedRows>
              <Column field="start_time" header="Von" />
              <Column field="end_time" header="Bis" />
              <Column header="Elternteil">
                <template #body="{ data }">
                  {{ data.parent_name || '–' }}
                </template>
              </Column>
              <Column header="Kind">
                <template #body="{ data }">
                  {{ data.child_name || '–' }}
                </template>
              </Column>
              <Column header="Aktionen" style="width: 80px">
                <template #body="{ data }">
                  <Button v-if="data.parent_name" icon="pi pi-trash" severity="danger"
                    text @click="deleteBooking(data.slot_id)" />
                </template>
              </Column>
            </DataTable>
            <p v-else-if="selectedEvent">Keine Termine vorhanden.</p>
          </div>
        </TabPanel>
        <!-- Tab 2: Verfügbarkeit -->
        <TabPanel value="1">
          <div class="mt-3">
            <p class="text-color-secondary mb-3">
              Hier können Sie Ihre Verfügbarkeit pro Sprechtag anpassen.
            </p>
            <DataTable :value="myTeacherEvents" stripedRows>
              <Column header="Sprechtag">
                <template #body="{ data }">
                  {{ data.event_name }} – {{ new Date(data.date).toLocaleDateString('de-DE') }}
                </template>
              </Column>
              <Column header="Von">
                <template #body="{ data }">
                  <InputText v-model="data.time_start" class="time-input" />
                </template>
              </Column>
              <Column header="Bis">
                <template #body="{ data }">
                  <InputText v-model="data.time_end" class="time-input" />
                </template>
              </Column>
              <Column header="Aktiv">
                <template #body="{ data }">
                  <Checkbox v-model="data.active" :binary="true" />
                </template>
              </Column>
              <Column header="">
                <template #body="{ data }">
                  <Button label="Speichern" size="small" @click="saveTeacherEvent(data)" />
                </template>
              </Column>
            </DataTable>
          </div>
        </TabPanel>

        <!-- Tab 3: Alle Termine -->
        <TabPanel value="2" v-if="user?.role === 'global_admin' || user?.role === 'school_admin'">
          <div class="flex flex-column gap-3 mt-3">
            <div class="flex gap-2">
              <Select v-model="selectedEventAll" :options="allEvents" optionLabel="name"
                placeholder="Sprechtag wählen" @change="loadAllBookings" class="w-full" />
            </div>

            <DataTable v-if="allBookings.length > 0" :value="allBookings" stripedRows
              sortMode="multiple">
              <Column header="Lehrer" sortable :sortField="data => `${data.last_name} ${data.first_name}`">
                <template #body="{ data }">
                  {{ data.last_name }}, {{ data.first_name }}
                </template>
              </Column>
              <Column field="start_time" header="Von" sortable />
              <Column field="end_time" header="Bis" />
              <Column field="parent_name" header="Elternteil" />
              <Column field="child_name" header="Kind" />
              <Column header="Aktionen" style="width: 80px">
                <template #body="{ data }">
                  <Button icon="pi pi-trash" severity="danger"
                    text @click="deleteBooking(data.slot_id)" />
                </template>
              </Column>
            </DataTable>
            <p v-else-if="selectedEventAll">Keine Buchungen vorhanden.</p>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Select from 'primevue/select'
import InputText from 'primevue/inputtext'
import Checkbox from 'primevue/checkbox'
import { authFetch } from '../utils/api.js'

const user = JSON.parse(localStorage.getItem('user') || 'null')

// Meine Termine
const myEvents = ref([])
const selectedEvent = ref(null)
const mySlots = ref([])

// Alle Termine
const allEvents = ref([])
const selectedEventAll = ref(null)
const allBookings = ref([])

const myTeacherEvents = ref([])

async function loadMyEvents() {
  const url = user?.role === 'global_admin'
    ? '/api/events'
    : `/api/events/school/${user.school_id}`
  const res = await authFetch(url)
  myEvents.value = await res.json()
  allEvents.value = myEvents.value
}

async function loadMySlots() {
  if (!selectedEvent.value) return
  const res = await authFetch(`/api/bookings/teacher/${user.id}/event/${selectedEvent.value.id}`)
  mySlots.value = await res.json()
}

async function loadAllBookings() {
  if (!selectedEventAll.value) return
  const res = await authFetch(`/api/bookings/event/${selectedEventAll.value.id}/all`)
  allBookings.value = await res.json()
}

async function deleteBooking(slot_id) {
  if (!confirm('Buchung wirklich löschen?')) return
  await authFetch(`/api/bookings/${slot_id}`, { method: 'DELETE' })
  await loadMySlots()
  await loadAllBookings()
}

async function saveTeacherEvent(te) {
  console.log('saveTeacherEvent:', te.time_start, te.time_end, te.active)
  await authFetch(`/api/events/${te.event_id}/teacher/${user.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      time_start: te.time_start,
      time_end: te.time_end,
      active: te.active,
    }),
  })
  await authFetch(`/api/slots/generate/${te.event_id}/teacher/${user.id}`, { method: 'POST' })
}

async function loadMyTeacherEvents() {
  const res = await authFetch(`/api/users/${user.id}/teacherevents`)
  const data = await res.json()
  myTeacherEvents.value = data.map(t => ({ ...t, active: !!t.active }))
}

onMounted(async () => {
  await loadMyEvents()
  await loadMyTeacherEvents()
})
</script>

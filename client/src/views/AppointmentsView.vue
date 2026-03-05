<template>
  <div>
    <h2 class="mb-4">Termine</h2>

    <Tabs value="0">
      <TabList>
        <Tab value="0">Meine Termine</Tab>
        <Tab value="1">Meine Verfügbarkeit</Tab>
        <Tab value="2" v-if="user?.role === 'global_admin' || user?.role === 'school_admin'"
          >Alle Termine</Tab
        >
      </TabList>

      <TabPanels>
        <!-- Tab 1: Meine Termine -->
        <TabPanel value="0">
          <div class="flex flex-column gap-3 mt-3">
            <div class="flex gap-2">
              <!-- Standard reicht nicht, möchte Datum dazu.
              <Select v-model="selectedEvent" :options="myEvents" optionLabel="name"
                placeholder="Sprechtag wählen" @change="loadMySlots" class="w-full" />
              -->
              <Select
                v-model="selectedEvent"
                :options="myEvents"
                optionLabel="name"
                placeholder="Sprechtag wählen"
                @change="loadMySlots"
                class="w-full"
              >
                <template #option="{ option }">
                  {{ option.name }} – {{ new Date(option.date).toLocaleDateString('de-DE') }}
                </template>
                <template #value="{ value }">
                  {{ value?.name }} –
                  {{ value ? new Date(value.date).toLocaleDateString('de-DE') : '' }}
                </template>
              </Select>
            </div>

            <DataTable :value="mySlots" stripedRows>
              <Column field="start_time" header="Von" />
              <Column field="end_time" header="Bis" />
              <Column field="parent_name" header="Elternteil" :editor="true">
                <template #body="{ data }">
                  <InputText v-model="data.parent_name" placeholder="-" @change="saveSlot(data)" />
                </template>
              </Column>
              <Column field="child_name" header="Kind" :editor="true">
                <template #body="{ data }">
                  <InputText v-model="data.child_name" placeholder="-" @change="saveSlot(data)" />
                </template>
                <template #editor="{ data, field }">
                  <InputText v-model="data[field]" autofocus />
                </template>
              </Column>
              <Column header="Aktionen" style="width: 80px">
                <template #body="{ data }">
                  <Button
                    v-if="data.parent_name"
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    @click="deleteBooking(data.slot_id)"
                  />
                </template>
              </Column>
            </DataTable>
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
              <Select
                v-model="selectedEventAll"
                :options="allEvents"
                optionLabel="name"
                placeholder="Sprechtag wählen"
                @change="loadAllBookings"
                class="w-full"
              />
            </div>

            <DataTable
              v-if="allBookings.length > 0"
              :value="allBookings"
              stripedRows
              sortMode="multiple"
            >
              <Column
                header="Lehrer"
                sortable
                :sortField="(data) => `${data.last_name} ${data.first_name}`"
              >
                <template #body="{ data }"> {{ data.last_name }}, {{ data.first_name }} </template>
              </Column>
              <Column field="start_time" header="Von" sortable />
              <Column field="end_time" header="Bis" />
              <Column field="parent_name" header="Elternteil" />
              <Column field="child_name" header="Kind" />
              <Column header="Aktionen" style="width: 80px">
                <template #body="{ data }">
                  <Button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    @click="deleteBooking(data.slot_id)"
                  />
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
import { ref, onMounted, onUnmounted, watch } from 'vue'
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
import socket from '../utils/socket.js'

import { authFetch, formatTime } from '../utils/api.js'

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

watch(selectedEvent, (newVal, oldVal) => {
  if (oldVal) socket.emit('leave-event', oldVal.id)
  if (newVal) socket.emit('join-event', newVal.id)
})

watch(selectedEventAll, (newVal, oldVal) => {
  if (oldVal) socket.emit('leave-event', oldVal.id)
  if (newVal) socket.emit('join-event', newVal.id)
})

async function loadMyEvents() {
  const url = user?.role === 'global_admin' ? '/api/events' : `/api/events/school/${user.school_id}`
  const res = await authFetch(url)
  myEvents.value = await res.json()
  allEvents.value = myEvents.value
}

async function loadMySlots() {
  if (!selectedEvent.value) return
  const res = await authFetch(`/api/bookings/teacher/${user.id}/event/${selectedEvent.value.id}`)
  const data = await res.json()
  mySlots.value = data.map((s) => ({
    ...s,
    start_time: formatTime(s.start_time),
    end_time: formatTime(s.end_time),
  }))
}

async function loadAllBookings() {
  if (!selectedEventAll.value) return
  const res = await authFetch(`/api/bookings/event/${selectedEventAll.value.id}/all`)
  const data = await res.json()
  allBookings.value = data.map((b) => ({
    ...b,
    start_time: formatTime(b.start_time),
    end_time: formatTime(b.end_time),
  }))
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
}

async function loadMyTeacherEvents() {
  const res = await authFetch(`/api/users/${user.id}/teacherevents`)
  const data = await res.json()
  myTeacherEvents.value = data.map((t) => ({
    ...t,
    active: !!t.active,
    time_start: formatTime(t.time_start),
    time_end: formatTime(t.time_end),
  }))
}

async function saveSlot(data) {
  if (!data.parent_name && !data.child_name) return
  await authFetch('/api/bookings/admin', {
    method: 'POST',
    body: JSON.stringify({
      slot_id: data.slot_id,
      parent_name: data.parent_name,
      child_name: data.child_name,
    }),
  })
}

onMounted(async () => {
  await loadMyEvents()
  await loadMyTeacherEvents()
  //sockets dazu nehmen
  socket.connect()

  socket.on('slot-booked', async ({ slot_id }) => {
    console.log('AppointmentsView - Slot gebucht:', slot_id)
    await loadMySlots()
    await loadAllBookings()
  })

  socket.on('slot-cancelled', async ({ slot_id }) => {
    console.log('AppointmentsView - Slot storniert:', slot_id)
    await loadMySlots()
    await loadAllBookings()
  })

  socket.on('slots-generated', async () => {
    console.log('AppointmentsView - Slots generiert')
    await loadMySlots()
    await loadAllBookings()
  })
})
onUnmounted(() => {
  socket.off('slot-booked')
  socket.off('slot-cancelled')
  socket.off('slots-generated')
  socket.disconnect()
})
</script>

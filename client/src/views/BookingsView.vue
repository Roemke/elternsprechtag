<template>
  <div class="booking-wrapper">
    <div class="booking-container">
      <h2 class="text-center mb-4">🏫 Elternsprechtag – Terminbuchung</h2>

      <!-- Info über gewählten Sprechtag -->
      <div class="p-card p-4 mb-3 flex align-items-center justify-content-between" v-if="selectedEvent">
        <span>
          <span class="font-bold">{{ selectedSchool?.name }}</span> – {{ selectedEvent?.name }} –
            {{ new Date(selectedEvent.date).toLocaleDateString('de-DE') }}
        </span>
        <Button v-if="multipleEvents && phase === 'booked'"
          label="Sprechtag wechseln"
          severity="secondary"
          @click="switchEvent"
        />
      </div>
      <!-- Auswahlbereich -->
      <div v-if="phase === 'select'">
        <!-- Schritt 1: Schule wählen -->
        <!-- Schritt 1: Schule wählen - nur wenn mehrere Schulen -->
        <div class="p-card p-4 mb-3" v-if="step===1 &&multipleSchools && !selectedSchool">
          <h3>Schule wählen</h3>
          <Select
            v-model="selectedSchool"
            :options="schools"
            optionLabel="name"
            placeholder="Schule wählen"
            @change="onSchoolChange"
            class="w-full"
          />
        </div>

        <!-- Schritt 2: Sprechtag wählen - nur wenn mehrere aktive Sprechtage -->
        <div class="p-card p-4 mb-3" v-if="step === 2 && multipleEvents && !selectedEvent">
          <h3>Sprechtag wählen</h3>
          <Select
            v-model="selectedEvent"
            :options="events"
            optionLabel="name"
            placeholder="Sprechtag wählen"
            @change="onEventChange"
            class="w-full"
          >
            <template #option="{ option }">
              {{ option.name }} – {{ new Date(option.date).toLocaleDateString('de-DE') }}
            </template>
          </Select>
        </div>
        <!-- Schritt 3: Lehrer wählen -->
        <div class="p-card p-4 mb-3" v-if="step >= 3">
          <h3>Lehrer wählen</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="teacher in teachers"
              :key="teacher.id"
              :label="`${teacher.last_name}, ${teacher.first_name}`"
              :disabled="!teacher.active"
              :outlined="selectedTeacher?.id !== teacher.id"
              @click="onTeacherSelect(teacher)"
            />
          </div>
        </div>
        <!-- Schritt 4: Slot wählen -->
        <div class="p-card p-4 mb-3" v-if="step >= 4">
          <h3>Termin wählen</h3>
          <div class="flex flex-wrap gap-2">
            <Button
              v-for="slot in slots"
              :key="slot.id"
              :label="`${slot.start_time} – ${slot.end_time}`"
              :severity="slot.booked ? 'secondary' : 'success'"
              :disabled="slot.booked"
              :outlined="selectedSlot?.id !== slot.id"
              @click="selectedSlot = slot"
            />
          </div>
        </div>

        <!-- Schritt 5: Daten eingeben -->
        <div class="p-card p-4 mb-3" v-if="step >= 4 && selectedSlot">
          <h3>Ihre Daten</h3>
          <div class="flex flex-column gap-3">
            <div class="flex flex-column gap-1">
              <label>Ihr Name</label>
              <InputText v-model="parentName" placeholder="Vor- und Nachname" />
            </div>
            <div class="flex flex-column gap-1">
              <label>Name SchülerIn</label>
              <InputText v-model="childName" placeholder="Vor- und Nachname" />
            </div>
            <Button label="Termin buchen" icon="pi pi-check" @click="bookSlot" :loading="loading" />
          </div>
        </div>
      </div>

      <!-- Meine Termine - immer sichtbar wenn vorhanden -->
      <div class="p-card p-4 mt-3" v-if="(myBookings.length > 0 || phase === 'booked') && selectedEvent">
        <h3>Meine gebuchten Termine</h3>
        <p v-if="myBookings.length === 0">Keine Termine vorhanden.</p>
        <DataTable :value="myBookings" stripedRows>
          <Column field="teacher" header="Lehrer" />
          <Column field="start_time" header="Uhrzeit" />
          <Column header="Löschen">
            <template #body="{ data }">
              <Button icon="pi pi-trash" severity="danger" text @click="cancelBooking(data)" />
            </template>
          </Column>
        </DataTable>
        <Button
          label="Termin buchen"
          class="mt-3"
          @click="startNewBooking"
          v-if="phase === 'booked'"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'

// Cookie-ID generieren oder aus Cookie lesen
function getCookieId() {
  const name = 'elternsprechtag_id'
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return match[2]
  const id = crypto.randomUUID()
  document.cookie = `${name}=${id}; max-age=31536000; path=/`
  return id
}

const cookieId = getCookieId()
const step = ref(1)
const phase = ref('select') // 'select' oder 'booked'
const schools = ref([])
const events = ref([])
const teachers = ref([])
const slots = ref([])
const myBookings = ref([])
const selectedSchool = ref(null)
const selectedEvent = ref(null)
const selectedTeacher = ref(null)
const selectedSlot = ref(null)
const parentName = ref(localStorage.getItem('parent_name') || '')
const childName = ref(localStorage.getItem('child_name') || '')
const loading = ref(false)
const booking = ref(null)
const multipleSchools = ref(false)
const multipleEvents = ref(false)

async function loadSchools() {
  const res = await fetch('/api/schools/active')
  schools.value = await res.json()
  multipleSchools.value = schools.value.length > 1

  // alle aktiven Events laden für alle Schulen
  for (const school of schools.value) {
    const res = await fetch(`/api/bookings/school/${school.id}/events`)
    const schoolEvents = await res.json()
    events.value.push(...schoolEvents)
  }
  multipleEvents.value = events.value.length > 1

  if (schools.value.length === 1) {
    selectedSchool.value = schools.value[0]
    if (events.value.length === 1) {
      selectedEvent.value = events.value[0]
      await onEventChange()
    }
  }
}

async function onSchoolChange() {
  const res = await fetch(`/api/bookings/school/${selectedSchool.value.id}/events`)
  events.value = await res.json()
  multipleEvents.value = events.value.length > 1
  console.log('events:', events.value.length, 'multipleEvents:', multipleEvents.value)
  if (events.value.length === 1) {
    selectedEvent.value = events.value[0]
    await onEventChange()
  } else {
    step.value = 2
  }
}

async function onEventChange() {
  selectedTeacher.value = null
  selectedSlot.value = null
  teachers.value = []
  slots.value = []
  if (!selectedEvent.value) return
  const res = await fetch(`/api/bookings/event/${selectedEvent.value.id}/teachers`)
  teachers.value = await res.json()
  step.value = 3
  await loadMyBookings()
}

async function onTeacherSelect(teacher) {
  if (!teacher.active) return
  selectedTeacher.value = teacher
  selectedSlot.value = null
  const res = await fetch(`/api/bookings/event/${selectedEvent.value.id}/teacher/${teacher.id}`)
  slots.value = await res.json()
  step.value = 4
}

async function bookSlot() {
  if (!parentName.value || !childName.value) return
  loading.value = true
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: selectedSlot.value.id,
        cookie_id: cookieId,
        parent_name: parentName.value,
        child_name: childName.value,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      booking.value = { ...selectedSlot.value }
      localStorage.setItem('parent_name', parentName.value)
      localStorage.setItem('child_name', childName.value)
      phase.value = 'booked'
      await loadMyBookings()
      // nach erfolgreicher Buchung
    } else {
      alert(data.error)
    }
  } finally {
    loading.value = false
  }
}
async function loadMyBookings() {
  const res = await fetch(`/api/bookings/cookie/${cookieId}`)
  const all = await res.json()

  if (all.length > 0 && !selectedEvent.value) {
  // letztes event nehmen das noch aktiv ist
    const activeBooking = [...all].reverse().find(b =>
      events.value.some(e => e.id === b.event_id)
    )
    if (activeBooking) {
      const event = events.value.find(e => e.id === activeBooking.event_id)
      if (event) {
        selectedEvent.value = event
        console.log('event.school_id:', event.school_id)
        console.log('schools.value:', schools.value)
        const school = schools.value.find(s => s.id === event.school_id)
          console.log('school gefunden:', school)
        if (school) selectedSchool.value = school
        await onEventChange()
      }
    }
  }


  myBookings.value = selectedEvent.value
    ? all.filter((b) => b.event_id === selectedEvent.value.id)
    : all

  if (myBookings.value.length > 0) {
    phase.value = 'booked'
  }
}

async function switchEvent() {
  selectedEvent.value = null
  selectedTeacher.value = null
  selectedSlot.value = null
  slots.value = []
  teachers.value = []
  phase.value = 'select'

  if (schools.value.length > 1) {
    selectedSchool.value = null
    step.value = 1
  } else {
    step.value = 2
  }
}

function startNewBooking() {
  selectedTeacher.value = null
  selectedSlot.value = null
  slots.value = []
  phase.value = 'select'
  step.value = 3
}


onMounted(async () => {
  await loadSchools()
  await loadMyBookings()
})
</script>

<style scoped>
.booking-wrapper {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 2rem;
}

.booking-container {
  max-width: 700px;
  margin: 0 auto;
}
</style>

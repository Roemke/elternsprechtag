<template>
  <div class="booking-wrapper">
    <div class="booking-container">
      <div class="p-card p-4 mb-3" v-if="!selectedEvent && events.length === 0 && !loading">
        <Message severity="info">
          Aktuell sind leider keine Sprechtage zur Buchung verfügbar. Bitte schauen Sie später
          wieder vorbei.
        </Message>
      </div>
      <!-- Info über gewählten Sprechtag -->
      <div
        class="p-card p-1 mb-3 flex align-items-center justify-content-between"
        v-if="selectedEvent"
      >
        <span>
          <span class="font-bold">{{ selectedSchool?.name }}</span> – {{ selectedEvent?.name }} –
          {{ new Date(selectedEvent.date).toLocaleDateString('de-DE') }}
        </span>
        <Button
          v-if="multipleEvents"
          label="Sprechtag wechseln"
          severity="secondary"
          @click="switchEvent"
        />
      </div>
      <!-- Auswahlbereich -->
      <div v-if="phase === 'select'">
        <!-- Schritt 1: Schule wählen -->
        <!-- Schritt 1: Schule wählen - nur wenn mehrere Schulen -->
        <div class="p-card p-1 mb-3" v-if="step === 1 && multipleSchools && !selectedSchool">
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
            @change="
              async () => {
                await onEventChange()
                await loadMyBookings()
              }
            "
            class="w-full"
          >
            <template #option="{ option }">
              {{ option.name }} – {{ new Date(option.date).toLocaleDateString('de-DE') }}
            </template>
          </Select>
        </div>
        <!-- Schritt 3: Lehrer wählen -->
        <h3 class="mt-0" v-if="step === 3">Lehrer wählen</h3>
        <div
          style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; padding: 0.5rem"
          v-if="step === 3"
        >
          <Button
            v-for="teacher in teachers"
            :key="teacher.id"
            :label="`${teacher.last_name}, ${teacher.first_name}`"
            :disabled="!teacher.active"
            :outlined="selectedTeacher?.id !== teacher.id"
            @click="onTeacherSelect(teacher)"
          />
        </div>
        <!-- Schritt 4: Slot wählen -->
        <div class="p-card p-1 mb-3" v-if="step >= 4 && !selectedSlot">
          <h3 class="inline">Termin wählen</h3>
          <span> ( bei {{ terminLabelTeacher }}) </span>
          <div class="mt-2 flex flex-wrap gap-2">
            <Button
              v-for="slot in slots"
              :key="slot.id"
              :label="`${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`"
              :severity="slot.booked ? 'secondary' : 'success'"
              :disabled="slot.booked"
              :outlined="selectedSlot?.id !== slot.id"
              @click="selectedSlot = slot"
            />
          </div>
        </div>
        <div class="mt-3" v-if="step >= 4 && !selectedSlot">
          <Button
            label="Abbrechen"
            severity="secondary"
            outlined
            icon="pi pi-times"
            @click="
              () => {
                selectedTeacher = null
                selectedSlot = null
                step = 3
              }
            "
          />
        </div>

        <!-- Schritt 5: Daten eingeben -->
        <div class="p-card p-1 mb-3" v-if="step >= 4 && selectedSlot">
          <h3 class="inline">Ihre Daten</h3>
          <span> – Termin: {{ terminLabelTeacher }}</span>
          <div class="p-4 flex flex-column gap-3">
            <div class="flex flex-column gap-1">
              <label>Ihr Name</label>
              <InputText v-model="parentName" placeholder="Vor- und Nachname" />
            </div>
            <div class="flex flex-column gap-1">
              <label>Name SchülerIn</label>
              <InputText v-model="childName" placeholder="Vor- und Nachname" />
            </div>
            <Button label="Termin buchen" icon="pi pi-check" @click="bookSlot" :loading="loading" />
            <!-- wg anderer Position nochmals -->
            <Button
              label="Abbrechen"
              severity="secondary"
              outlined
              icon="pi pi-times"
              @click="
                () => {
                  selectedTeacher = null
                  selectedSlot = null
                  step = 3
                }
              "
            />
          </div>
        </div>
      </div>

      <!-- Meine Termine - immer sichtbar wenn vorhanden -->
      <div
        class="p-card p-2 mt-3"
        v-if="(myBookings.length > 0 || phase === 'booked') && selectedEvent"
      >
        <Button
          label="Termin buchen"
          class="mt-3"
          @click="startNewBooking"
          v-if="phase === 'booked'"
        />

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
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import Select from 'primevue/select'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Message from 'primevue/message'
import { computed } from 'vue'
import socket from '../utils/socket.js'
import { formatTime } from '../utils/api.js'
const terminLabelTeacher = computed(() => {
  const teacher = selectedTeacher.value
    ? ` ${selectedTeacher.value.first_name} ${selectedTeacher.value.last_name}`
    : ''
  const slot = selectedSlot.value
    ? `, ${selectedSlot.value.start_time} – ${selectedSlot.value.end_time}`
    : ''
  return teacher + slot
})

// Cookie-ID generieren oder aus Cookie lesen
function getCookieId() {
  const name = 'elternsprechtag_id'
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  if (match) return match[2]
  const id =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36)
  document.cookie = `${name}=${id}; max-age=31536000; path=/`
  return id
}

// Identifikation des Nutzers ohne Login
const cookieId = getCookieId() // eindeutige ID aus Browser-Cookie, identifiziert den Elternteil

// Ablaufsteuerung
const step = ref(1) // 1=Schule, 2=Sprechtag, 3=Lehrer, 4=Slot+Formular
const phase = ref('select') // 'select'=Auswahlmodus, 'booked'=nach Buchung

// Geladene Stammdaten
const schools = ref([]) // alle Schulen mit aktiven Sprechtagen
const events = ref([]) // alle aktiven Sprechtage (aller Schulen)
const teachers = ref([]) // Lehrer des gewählten Sprechtags
const slots = ref([]) // Slots des gewählten Lehrers (mit booked-Flag)
const myBookings = ref([]) // gebuchte Termine des aktuellen Nutzers (gefiltert nach Event)

// Aktuelle Auswahl
const selectedSchool = ref(null) // gewählte Schule
const selectedEvent = ref(null) // gewählter Sprechtag
const selectedTeacher = ref(null) // gewählter Lehrer
const selectedSlot = ref(null) // gewählter Slot (noch nicht gebucht)

// Formulardaten
const parentName = ref(localStorage.getItem('parent_name') || '') // Name des Elternteils (aus localStorage vorbelegt)
const childName = ref(localStorage.getItem('child_name') || '') // Name des Kindes (aus localStorage vorbelegt)

// Hilfsvariablen
const loading = ref(false) // true während API-Calls laufen
const multipleSchools = ref(false) // true wenn mehr als eine Schule aktiv
const multipleEvents = ref(false) // true wenn mehr als ein aktiver Sprechtag vorhanden (alle Schulen)

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
  console.log('events:', events.value.length, 'multipleEvents:', multipleEvents.value)
  if (events.value.length === 1) {
    selectedEvent.value = events.value[0]
    await onEventChange()
    await loadMyBookings()
  } else {
    step.value = 2
  }
}

async function onEventChange() {
  // alten Room verlassen
  selectedTeacher.value = null
  selectedSlot.value = null
  teachers.value = []
  slots.value = []
  if (!selectedEvent.value) return
  // Schule zum Event setzen
  const school = schools.value.find((s) => s.id === selectedEvent.value.school_id)
  if (school) selectedSchool.value = school
  const res = await fetch(`/api/bookings/event/${selectedEvent.value.id}/teachers`)
  teachers.value = await res.json()
  step.value = 3
}

async function onTeacherSelect(teacher) {
  console.log('Lehrer ausgewählt:', teacher.first_name, teacher.last_name, 'aktiv:', teacher.active)
  if (!teacher.active) return
  selectedTeacher.value = teacher
  selectedSlot.value = null
  const res = await fetch(`/api/bookings/event/${selectedEvent.value.id}/teacher/${teacher.id}`)
  slots.value = await res.json()
  step.value = 4
  console.log(selectedSlot.value + ' type: ' + typeof selectedSlot.value)
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
    const activeBooking = [...all]
      .reverse()
      .find((b) => events.value.some((e) => e.id === b.event_id))
    if (activeBooking) {
      const event = events.value.find((e) => e.id === activeBooking.event_id)
      if (event) {
        selectedEvent.value = event
        console.log('event.school_id:', event.school_id)
        console.log('schools.value:', schools.value)
        const school = schools.value.find((s) => s.id === event.school_id)
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

async function cancelBooking(b) {
  if (!confirm('Termin wirklich löschen?')) return
  await fetch(`/api/bookings/${b.slot_id}/cookie/${cookieId}`, { method: 'DELETE' })
  await loadMyBookings()
}

function startNewBooking() {
  selectedTeacher.value = null
  selectedSlot.value = null
  slots.value = []
  phase.value = 'select'
  step.value = 3
}

//änderungen für socket.io

watch(selectedEvent, (newVal, oldVal) => {
  if (oldVal) socket.emit('leave-event', oldVal.id)
  if (newVal) socket.emit('join-event', newVal.id)
})

onMounted(async () => {
  await loadSchools()
  console.log('schools geladen:', schools.value)
  await loadMyBookings()
  console.log('myBookings geladen:', myBookings.value)

  socket.connect()

  socket.on('slot-booked', ({ slot_id }) => {
    // Slot als gebucht markieren
    console.log('Slot gebucht:', slot_id)
    const slot = slots.value.find((s) => s.id === slot_id)
    if (slot) slot.booked = true
  })
  socket.on('slot-updated', ({ slot_id }) => {
    // nur mitteilen, brauche ich hier eigentlich nicht
    console.log('Slot updated:', slot_id)
  })

  socket.on('slot-cancelled', ({ slot_id }) => {
    // Slot als frei markieren
    console.log('Slot storniert:', slot_id)
    const id = parseInt(slot_id)
    const slot = slots.value.find((s) => s.id === id)
    console.log('Slot gefunden:', slot)
    if (slot) slot.booked = false
  })

  socket.on('slots-generated', async ({ teacher_event_id }) => {
    console.log('Socket-Event: Slots generiert für Lehrer:', teacher_event_id)
    await loadMyBookings() // eigene Buchungen neu laden
    // Slots neu laden wenn ein Lehrer gewählt ist
    if (selectedTeacher.value) {
      const res = await fetch(
        `/api/bookings/event/${selectedEvent.value.id}/teacher/${selectedTeacher.value.id}`,
      )
      slots.value = await res.json()
    }
  })

  socket.on('slots-extended', async ({ teacher_event_id }) => {
    console.log('Socket-Event: Slots erweitert für Lehrer:', teacher_event_id)
    if (selectedTeacher.value) {
      const res = await fetch(
        `/api/bookings/event/${selectedEvent.value.id}/teacher/${selectedTeacher.value.id}`,
      )
      slots.value = await res.json()
    }
  })
})

onUnmounted(() => {
  socket.off('slot-cancelled')
  socket.off('slot-booked')
  socket.off('slot-updated')
  socket.off('slots-generated')
  socket.off('slots-extended')

  if (selectedEvent.value) {
    socket.emit('leave-event', selectedEvent.value.id)
  }
  socket.disconnect()
})
</script>

<style scoped>
.inline {
  display: inline;
}
.booking-wrapper {
  min-height: 100vh;
  background: #f3f4f6;
  padding: 1rem;
}
@media (max-width: 600px) {
  .booking-wrapper {
    padding: 0.5rem;
  }
}

.booking-container {
  max-width: 700px;
  margin: 0 auto;
}
@media (max-width: 600px) {
  .booking-container {
    max-width: 100%;
  }
}
</style>

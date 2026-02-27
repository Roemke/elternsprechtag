<template>
  <div>
    <Menubar :model="menuItems" class="mb-4">
      <template #start>
        <span class="font-bold text-xl mr-4">🏫 Elternsprechtag</span>
      </template>
      <template #end>
        <span class="mr-3 text-sm text-color-secondary">{{ user?.name }}</span>
        <Button label="Abmelden" icon="pi pi-sign-out" severity="secondary" @click="logout" />
      </template>
    </Menubar>

    <div class="p-4">
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Menubar from 'primevue/menubar'
import Button from 'primevue/button'

const router = useRouter()
const user = JSON.parse(localStorage.getItem('user') || 'null')

const menuItems = computed(() => {
  const items = []

  // Schulen nur für globalen Admin
  if (user?.role === 'global_admin') {
    items.push({
      label: 'Schulen',
      icon: 'pi pi-building',
      command: () => router.push('/app/schools'),
    })
  }

  // Lehrer verwalten für global_admin und school_admin
  if (user?.role === 'global_admin' || user?.role === 'school_admin') {
    items.push({
      label: 'Lehrer',
      icon: 'pi pi-users',
      command: () => router.push('/app/teachers'),
    })
  }

  // Termine immer sichtbar
  items.push({
    label: 'Meine Termine',
    icon: 'pi pi-calendar',
    command: () => router.push('/app/appointments'),
  })

  return items
})

function logout() {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.p-menubar {
  border-radius: 0;
  border-left: none;
  border-right: none;
  border-top: none;
}
</style>

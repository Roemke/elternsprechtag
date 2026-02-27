import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AppView from '../views/AppView.vue'
import SchoolsView from '../views/SchoolsView.vue'
import TeachersView from '../views/TeachersView.vue'
import AppointmentsView from '../views/AppointmentsView.vue'
import EventsView from '../views/EventsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginView },
    {
      path: '/app',
      component: AppView,
      children: [
        { path: 'schools', component: SchoolsView },
        { path: 'teachers', component: TeachersView },
        { path: 'appointments', component: AppointmentsView },
        { path: 'events', component: EventsView },
      ]
      /*
      Der Router macht dann folgendes:
        Er sieht /app → lädt AppView.vue in den obersten RouterView in App.vue
        Er sieht /schools als Child → lädt SchoolsView.vue in den RouterView der in AppView.vue steht
      */
    },
  ],
})

router.beforeEach((to) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null')
  if (to.path.startsWith('/app') && !user) {
    return '/login'
  }
})

export default router

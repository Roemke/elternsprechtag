import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AdminView from '../views/AdminView.vue'
import SchoolsView from '../views/SchoolsView.vue'
import TeachersView from '../views/TeachersView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: LoginView },
    { path: '/admin', component: AdminView },
    { path: '/admin/schools', component: SchoolsView },
    { path: '/admin/teachers', component: TeachersView },
  ],
})

export default router

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'
import Tooltip from 'primevue/tooltip'
import ConfirmationService from 'primevue/confirmationservice'

const app = createApp(App)

app.use(ConfirmationService)
app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Aura,
  },
  pt: {
    dialog: {
      root: { style: 'width: 90vw; max-width: 800px' },
      footer: { style: 'display: flex; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap' },
    },
  },
})
app.directive('tooltip', Tooltip)

app.mount('#app')

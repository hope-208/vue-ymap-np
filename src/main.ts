import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createYmaps } from 'vue-yandex-maps'

const app = createApp(App)

app.use(ElementPlus)
app.use(
  createYmaps({
    apikey: import.meta.env.VITE_YANDEX_API_KEY,
    lang: 'ru_RU',
  }),
)
app.mount('#app')

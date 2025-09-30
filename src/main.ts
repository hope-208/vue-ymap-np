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
    apikey: 'f5d0afd4-53ae-4593-83c8-9a1ec3485f59',
    lang: 'ru_RU',
  }),
)
app.mount('#app')

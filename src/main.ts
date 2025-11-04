import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createYmaps } from 'vue-yandex-maps'
import { getApiKey } from '@/utils/apiKey'

const app = createApp(App)

app.use(ElementPlus)
app.use(
  createYmaps({
    apikey: getApiKey(),
    lang: 'ru_RU',
  }),
)
app.mount('#app')

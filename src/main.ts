import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import { createYmaps } from 'vue-yandex-maps'

// Функция для получения API ключа из переменных окружения или глобальной переменной
const getApiKey = (): string => {
  // @ts-expect-error: window.VITE_YANDEX_API_KEY инжектируется через HTML
  return import.meta.env?.YANDEX_API_KEY || window.YANDEX_API_KEY
}

const app = createApp(App)

// Функция для получения API ключа из переменных окружения или глобальной переменной
const getApiKey = (): string => {
  // @ts-expect-error: window.VITE_YANDEX_YMAP_API_KEY инжектируется через HTML
  return import.meta.env?.VITE_YANDEX_YMAP_API_KEY || window.VITE_YANDEX_YMAP_API_KEY
}

app.use(ElementPlus)
app.use(
  createYmaps({
    apikey: getApiKey(),
    lang: 'ru_RU',
  }),
)
app.mount('#app')

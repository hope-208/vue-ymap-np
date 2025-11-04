// Функция для получения API-ключа из переменных окружения или глобальной переменной
export const getApiKey = (): string => {
  // Пытаемся получить ключ из разных источников в порядке приоритета:
  // 1. window.YANDEX_API_KEY (для gh-pages)
  // 2. import.meta.env.VITE_YANDEX_YMAP_API_KEY (для локальной разработки)
  // 3. import.meta.env.VITE_YANDEX_GEO_API_KEY (для совместимости)
  // 4. Пустая строка (если ключ не найден)
  return import.meta.env?.VITE_YANDEX_YMAP_API_KEY || import.meta.env?.VITE_YANDEX_GEO_API_KEY || ''
}

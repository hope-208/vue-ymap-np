/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly YANDEX_API_KEY: string
  // другие переменные окружения
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

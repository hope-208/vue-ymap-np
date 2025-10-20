import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import mkcert from 'vite-plugin-mkcert'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/vue-ymap-np/' : '/',
  plugins: [vue(), vueDevTools(), mkcert()],
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src', import.meta.url)),
      },
    ],
  },
  server: {
    open: true,
    port: 5353,
    proxy: {
      '/ygeocoder': {
        target: 'https://geocode-maps.yandex.ru/1.x/',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/ygeocoder/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://geocode-maps.yandex.ru/1.x/')
          })
        },
      },
    },
  },
})

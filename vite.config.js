import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
// Request /api diteruskan ke server backend (lihat server/index.js).
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})

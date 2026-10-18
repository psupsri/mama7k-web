import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The Go API runs separately (see api/README.md). In development Vite proxies to it so the
// browser sees one origin and the session cookie works without CORS.
const API = process.env.API_URL ?? 'http://localhost:8787'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': API,
      '/media': API,
    },
  },
})

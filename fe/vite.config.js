import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Dev proxy so the browser can call the Express API on :3003 without CORS.
    // Set VITE_API_BASE_URL=/api and requests to /api/tasks are forwarded to
    // the backend as /tasks.
    proxy: {
      '/api': {
        target: process.env.TASK_API_URL ?? 'http://127.0.0.1:3003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})

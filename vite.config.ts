import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/user': {
        target: 'https://userv1.dv-content.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/user/, ''),
        secure: true,
      },
      '/api/smartvideo': {
        target: 'https://smartvideo-api.galaxydve.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/smartvideo/, ''),
        secure: true,
      },
    },
  },
})

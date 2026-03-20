import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    legacy({
      targets: ['chrome >= 53'],
      modernTargets: ['chrome >= 53'],
      modernPolyfills: true,
    }),
  ],
  css: {
    transformer: 'postcss',
  },
  optimizeDeps: {
    exclude: ['@digitalvirgo/drm-player'],
    include: ['blueimp-md5'],
  },
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

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig(({ mode }) => {
  const isWebOsMode = mode === 'webos'

  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      ...(isWebOsMode
        ? [
            legacy({
              // webOS browser engines vary a lot; this keeps syntax conservative.
              targets: ['chrome >= 53'],
              modernTargets: ['chrome >= 53'],
              modernPolyfills: true,
            }),
          ]
        : []),
    ],
    build: {
      ...(isWebOsMode ? { outDir: 'dist/webos' } : {}),
    },
    define: {
      __LEGACY_BUILD__: JSON.stringify(isWebOsMode),
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
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      // Permitir archivos de hasta 5 MB en la precarga del Service Worker
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },

      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'masked-icon.svg'
      ],

      manifest: {
        name: 'JornadaPro',
        short_name: 'JornadaPro',
        description: 'Control profesional de jornadas y asistencia',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone',

        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3076/3076129.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'https://cdn-icons-png.flaticon.com/512/3076/3076129.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: '/pet-record-web/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: '我が子の成長記録',
        short_name: '成長記録',
        description: 'ペットの体重・食事・排泄などの成長記録をつけるアプリ',
        start_url: '/pet-record-web/',
        scope: '/pet-record-web/',
        display: 'standalone',
        background_color: '#fafafa',
        theme_color: '#4caf50',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH wordt door de GitHub Actions workflow automatisch gezet naar
// "/<repo-naam>/", omdat GitHub Pages project-sites onder die submap draaien.
// Lokaal (npm run dev) valt dit terug op "/".
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Weekmenu Planner',
        short_name: 'Weekmenu',
        description: 'Plan je weekmenu, beheer je kookboek en genereer je boodschappenlijst.',
        theme_color: '#0F766E',
        background_color: '#F9FAFB',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}']
      }
    })
  ]
});

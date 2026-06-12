/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin']
      }
    }),
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024
    }),
    compression({
      algorithm: 'brotliCompress',
      exclude: [/\.(br)$/, /\.(gz)$/],
      threshold: 1024
    }),
      visualizer({
      open: false,
        gzipSize: true,
        brotliSize: true,
      filename: 'dist/stats.html'
      }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['p-logo.svg', 'apple-touch-icon.png', 'favicon-64x64.png'],
      manifest: {
        name: 'PyrHouse',
        short_name: 'PyrHouse',
        description: 'System zarządzania sprzętem i magazynem Pyrkonu',
        start_url: '/home',
        display: 'standalone',
        background_color: '#0f0f23',
        theme_color: '#ff9800',
        orientation: 'portrait-primary',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'pwa-*.png', 'maskable-*.png', 'mtp-map.webp'],
        globIgnores: ['stats.html'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    hmr: {
      overlay: false
    }
  },
  preview: {
    // Must NOT share the dev-server origin: the built app registers a PWA
    // service worker which would hijack dev requests on the same port
    port: 4173,
    strictPort: true,
    cors: true,
    headers: {
      'Cache-Control': 'public, max-age=31536000'
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
  build: {
    target: 'es2020',
    minify: 'terser',
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) {
            return 'vendor-react';
          }
          if (id.includes('/node_modules/@mui/') || id.includes('/node_modules/@emotion/')) {
            return 'vendor-mui';
          }
          if (id.includes('/node_modules/@vis.gl/')) {
            return 'vendor-maps';
          }
          if (id.includes('/node_modules/date-fns/') || id.includes('/node_modules/jwt-decode/')) {
            return 'vendor-utils';
          }
        }
      }
    },
    cssCodeSplit: true,
    cssTarget: 'chrome80',
    reportCompressedSize: true,
    sourcemap: false,
    terserOptions: {
      compress: {
        // Keep console.error/warn in prod — a crashing app with a silent console
        // is undebuggable (drop_console: true stripped errors too)
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      },
      format: {
        comments: false
      }
    }
  },
})
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { compression } from 'vite-plugin-compression2'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: [
          ['@babel/plugin-transform-runtime', {
            regenerator: true
          }],
          '@emotion/babel-plugin'
        ]
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
    port: 3000,
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
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      },
      format: {
        comments: false
      }
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/icons-material'
    ],
    exclude: ['@emotion/cache'],
    esbuildOptions: {
      target: 'es2015',
      treeShaking: true,
      define: {
        global: 'globalThis'
    }
  }
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
    treeShaking: true,
    minifyWhitespace: true,
    minifyIdentifiers: true,
    minifySyntax: true
  }
})
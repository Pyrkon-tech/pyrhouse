import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

/**
 * The shop's HTML entry is shop.html (index.html belongs to the warehouse). In dev every page
 * request is served shop.html; in the build it is emitted as index.html, so the static host's
 * catch-all can stay the usual one.
 */
const shopHtml = (): Plugin => ({
  name: 'shop-html',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? '/';
      const isPage = req.headers.accept?.includes('text/html') && !url.startsWith('/@') && !/\.[a-z0-9]+(\?|$)/i.test(url);
      if (isPage) req.url = '/shop.html';
      next();
    });
  },
  writeBundle(options) {
    const dir = options.dir ?? 'dist-shop';
    if (fs.existsSync(path.join(dir, 'shop.html'))) fs.renameSync(path.join(dir, 'shop.html'), path.join(dir, 'index.html'));
  },
})

// Organizer shop (shop.pyrhouse.space) — a second app in this repo, built separately from the
// warehouse (docs/shop/PLAN.md, D1). No PWA: organizers use it a few times a year.
export default defineConfig({
  publicDir: path.resolve(__dirname, 'shop/public'),
  plugins: [
    shopHtml(),
    react({
      jsxImportSource: '@emotion/react',
      babel: {
        plugins: ['@emotion/babel-plugin'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001,
    strictPort: true,
  },
  preview: {
    port: 4174,
    strictPort: true,
  },
  build: {
    outDir: 'dist-shop',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'shop.html'),
    },
  },
})

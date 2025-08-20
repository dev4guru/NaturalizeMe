import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  css: {
    postcss: './postcss.config.js'
  },
  optimizeDeps: {
    include: ['alpinejs', 'chart.js']
  }
})

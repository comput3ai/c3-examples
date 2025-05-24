import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: false
  },
  preview: {
    port: 4173,
    strictPort: true
  }
})
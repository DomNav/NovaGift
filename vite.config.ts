import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
  define: {
    __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || 'http://localhost:4000'),
    'import.meta.env.VITE_ENABLE_AMM': JSON.stringify(process.env.VITE_ENABLE_AMM || 'false'),
  },
})
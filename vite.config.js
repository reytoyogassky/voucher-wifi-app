import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/voucher-wifi-app/',  // Ganti dengan nama repository Anda
  server: {
    port: 3000,
    open: true
  }
})
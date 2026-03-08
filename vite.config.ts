import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/shein-api': {
        target: 'https://www.sheinindia.in',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/shein-api/, ''),
      },
    },
  },
})

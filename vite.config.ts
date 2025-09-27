import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  root: 'src/renderer',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/frappe': {
        target: 'https://portal.nexo4erp.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/frappe/, ''),
        cookieDomainRewrite: 'localhost',
        headers: {
          Origin: 'https://portal.nexo4erp.com',
        },
      },
    },
  },
}))

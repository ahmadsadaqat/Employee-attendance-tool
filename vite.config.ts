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
        target: 'https://portal.nexo4erp.com', // Fallback default
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/frappe/, ''),
        cookieDomainRewrite: 'localhost',
        // Dynamic router based on header from client
        router: (req) => {
          const target = req.headers['x-proxy-target'];
          // Debug log
          if (target) {
            console.log(`[Proxy Router] Using Client Header: ${target}`);
          } else {
            console.log(`[Proxy Router] Header missing. Defaulting to: https://portal.nexo4erp.com`);
          }
          return (typeof target === 'string' ? target : 'https://portal.nexo4erp.com');
        },
        configure: (proxy, _options) => {
           proxy.on('proxyReq', (proxyReq, req, _res) => {
               const headerTarget = req.headers['x-proxy-target'];
               const target = (typeof headerTarget === 'string' ? headerTarget : 'https://portal.nexo4erp.com');

               console.log(`[Proxy Request] ${req.method} ${req.url} -> ${target}`);
               proxyReq.setHeader('Origin', target);
           });
           proxy.on('error', (err, _req, _res) => {
               console.error('[Proxy Error]', err);
           });
        }
      },
    },
  },
}))

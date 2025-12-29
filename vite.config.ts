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
               // console.log('[Proxy Request] Cookies:', req.headers.cookie); // Debug incoming cookies

               // Critical: Set Host header so SNI/Frappe knows which site to serve
               try {
                   const urlObj = new URL(target);
                   proxyReq.setHeader('Host', urlObj.host);
                   proxyReq.setHeader('Origin', target);
               } catch (e) {
                   console.error('[Proxy Error] Invalid target URL for Host header:', target);
               }
           });

           proxy.on('proxyRes', (proxyRes, req, res) => {
               // Debug Set-Cookie headers from server
               const cookies = proxyRes.headers['set-cookie'];
               if (cookies) {
                   console.log('[Proxy Response] Received Cookies:', cookies);
                   // Modify cookies to ensure they work on localhost (strip Secure, fix Domain)
                   proxyRes.headers['set-cookie'] = cookies.map(cookie => {
                       return cookie
                           .replace(/; Secure/gi, '') // Remove Secure flag so it works on http://localhost
                           .replace(/; SameSite=[a-z]+/gi, '; SameSite=Lax') // Ensure SameSite is compatible
                           .replace(/; Domain=[^;]+/gi, ''); // Remove Domain so it defaults to localhost
                   });
                   console.log('[Proxy Response] Modified Cookies:', proxyRes.headers['set-cookie']);
               }
           });

           proxy.on('error', (err, _req, _res) => {
               console.error('[Proxy Error]', err);
           });
        }
      },
    },
  },
}))

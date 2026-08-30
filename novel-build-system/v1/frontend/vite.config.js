import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GH_PAGES ? '/novel-generator/' : '/',
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        timeout: 0,
        // SSE 透传：http-proxy 对 event-stream 禁止缓冲
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // 禁止后端/代理缓冲
            proxyReq.setHeader('Cache-Control', 'no-cache')
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
              // 告诉任何中间层不要缓冲
              res.setHeader('X-Accel-Buffering', 'no')
              res.setHeader('Cache-Control', 'no-cache')
            }
          })
        },
      },
    },
  },
})

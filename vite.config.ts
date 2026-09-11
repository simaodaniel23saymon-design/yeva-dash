import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

const BUILD_ID =
  process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12) ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  Date.now().toString(36)

function injectSwCacheVersion() {
  return {
    name: 'yeva-inject-sw-cache-version',
    apply: 'build' as const,
    closeBundle() {
      const swPath = path.resolve(__dirname, 'dist/sw.js')
      if (!fs.existsSync(swPath)) return
      const src = fs.readFileSync(swPath, 'utf8')
      fs.writeFileSync(swPath, src.replace(/__YEWA_CACHE_VERSION__/g, BUILD_ID))
      console.log(`[yeva-sw] CACHE_VERSION=${BUILD_ID}`)
    },
  }
}

export default defineConfig({
  plugins: [react(), injectSwCacheVersion()],
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(BUILD_ID),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor'
            if (id.includes('axios') || id.includes('recharts')) return 'ui'
            if (id.includes('lightweight-charts')) return 'charts'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
})

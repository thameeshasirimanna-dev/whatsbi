import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')
  const prefix = mode === 'production' ? 'PROD_' : 'DEV_'

  return {
    plugins: [react()],
    envDir: '..',
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify(
        env[`${prefix}VITE_BACKEND_URL`] ?? process.env.VITE_BACKEND_URL ?? 'http://localhost:8080'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['framer-motion', 'lucide-react', '@headlessui/react'],
            'vendor-pdf': ['jspdf', 'html2canvas'],
            'vendor-charts': ['chart.js', 'react-chartjs-2'],
            'vendor-misc': ['socket.io-client', 'dompurify'],
          },
        },
      },
    },
  }
})

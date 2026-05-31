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
        env[`${prefix}VITE_BACKEND_URL`] ?? 'http://localhost:8080'
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})

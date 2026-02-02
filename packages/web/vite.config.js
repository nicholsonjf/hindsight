import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env from monorepo root
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '')

  return {
    plugins: [react()],
    server: {
      port: parseInt(env.WEB_PORT || '5173')
    },
    preview: {
      port: parseInt(env.WEB_PORT || '5173')
    },
    define: {
      // Expose env vars to client code
      'import.meta.env.VITE_LM_API_TOKEN': JSON.stringify(env.LM_API_TOKEN),
      'import.meta.env.VITE_API_URL': JSON.stringify(env.API_URL || `http://localhost:${env.PORT || '3000'}`),
      'import.meta.env.VITE_LM_STUDIO_URL': JSON.stringify(env.LM_STUDIO_URL || 'ws://127.0.0.1:1234')
    },
    resolve: {
      alias: {
        // Fix: @lmstudio/lms-isomorphic package.json has browser: "dist/cjs/browser.js"
        // but Vite needs ESM. Redirect to the ESM version.
        '@lmstudio/lms-isomorphic': env.LMSTUDIO_SDK_PATH
          ? path.resolve(env.LMSTUDIO_SDK_PATH, '../lms-isomorphic/dist/esm/browser.js')
          : path.resolve(__dirname, '../../node_modules/lmstudio-js/node_modules/@lmstudio/lms-isomorphic/dist/esm/browser.js')
      }
    }
  }
})

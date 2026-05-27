import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// COOP + COEP são obrigatórios para SharedArrayBuffer (usado pelo vosk-browser WASM)
const wasmHeaders = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
}

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: wasmHeaders,
  },
  preview: {
    headers: wasmHeaders,
  },
})

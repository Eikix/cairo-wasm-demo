import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  worker: {
    // Ensures workers can also use ES modules and bundle correctly.
    format: 'es',
    // You might need to add wasm plugins here if they don't apply by default to workers
    // plugins: () => [vite कुछ-wasm-plugin()]
  }
})

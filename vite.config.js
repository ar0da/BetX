import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Pinata API anahtarlarını ve JWT'yi client tarafında kullanılabilir hale getir
    // Vite, VITE_ önekli değişkenleri otomatik olarak import.meta.env üzerinden erişilebilir yapar
    // Ek tanımlamaya gerek yok
  },
  resolve: {
    alias: {
      '@multiversx/sdk-wallet': path.resolve(__dirname, 'node_modules/@multiversx/sdk-wallet'),
      '@multiversx/sdk-core': path.resolve(__dirname, 'node_modules/@multiversx/sdk-core'),
      '@multiversx/sdk-network-providers': path.resolve(__dirname, 'node_modules/@multiversx/sdk-network-providers'),
      // Buffer polyfill için gerekli
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    host: true,
    port: 3000,
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..', 'public'],
      // Explicitly allow wallet directory
      strict: false
    },
    // Add headers to allow file access
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept'
    }
  }
})

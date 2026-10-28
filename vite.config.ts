import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { handleApiRequest } from './src/server/api.ts'

function apiServerPlugin(): Plugin {
  return {
    name: 'anveshan-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          await handleApiRequest(req, res);
        } else {
          next();
        }
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api')) {
          await handleApiRequest(req, res);
        } else {
          next();
        }
      });
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), apiServerPlugin()],
  server: {
    port: 5173,
    host: true,
  },
})

import { defineConfig } from 'vite';

// En dev, le WebSocket est proxifié vers le serveur de jeu local (port 8080)
export default defineConfig({
  server: {
    proxy: {
      '/ws': { target: 'ws://localhost:8091', ws: true },
    },
  },
});

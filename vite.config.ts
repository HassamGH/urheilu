import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/watchfooty': {
        target: 'https://api.watchfooty.st',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/watchfooty/, '/api/v1')
      }
    }
  }
});

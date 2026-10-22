import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow accessing from mobile devices on local network
    port: 5173,
  },
  build: {
    target: 'esnext',
  },
});

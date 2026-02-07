import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      external: ['**/pb_data/**']
    }
  },
  server: {
    watch: {
      ignored: [
        // Ensure both forward and backward slashes are accounted for (cross-platform)
        '**/pb_data/**',
        '**\\pb_data\\**',

        // Match hidden files like .db-wal specifically
        '**/*.db-wal',
        '**/*.db-shm',

        // Add any additional folders
        '**/node_modules/**',
        '**/server/**'
      ]
    }
  }
});

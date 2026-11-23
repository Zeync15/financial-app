import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5173,
    // Supabase's redirect list names this exact port; fail instead of moving to 5174.
    strictPort: true,
    // Phone testing: Supabase won't send a Google sign-in back to a bare IP
    // (http://192.168.x.x), so the phone opens the PC by name instead, e.g.
    // http://192-168-100-6.sslip.io:5173 (sslip.io resolves that name to the IP).
    allowedHosts: ['.sslip.io'],
  },
  build: {
    outDir: 'dist/client',
  },
});

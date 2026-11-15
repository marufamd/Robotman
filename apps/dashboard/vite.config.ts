import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

const dashboardPort = Number(process.env.DASHBOARD_PORT ?? 3000);

export default defineConfig({
  plugins: [tailwind(), tanstackStart(), nitro(), react()],
  server: { port: dashboardPort, strictPort: true },
});

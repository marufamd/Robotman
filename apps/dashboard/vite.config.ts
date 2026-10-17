import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';

export default defineConfig({ plugins: [tailwind(), tanstackStart(), nitro(), react()] });

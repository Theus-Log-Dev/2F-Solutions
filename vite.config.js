import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' faz os assets funcionarem em qualquer caminho do GitHub Pages.
export default defineConfig({ base: './', plugins: [react()] });

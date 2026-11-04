import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from https://valagit12.github.io/portfolio/
export default defineConfig({
  base: '/portfolio/',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3 still uses @import / global functions internally
        silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'if-function'],
      },
    },
  },
});

import { defineConfig } from 'vite';

export default defineConfig({
  /* Relative paths so the site works under /two-five-app/ on GitHub Pages and anywhere else. */
  base: './',
  build: { outDir: 'dist', target: 'es2020' },
});

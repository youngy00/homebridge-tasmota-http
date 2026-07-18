import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: resolve(__dirname, '../dist/homebridge-ui/public'),
    emptyOutDir: true,
  },
});
import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

import { appVersionPlugin } from './vite-plugin-app-version.js';

export default defineConfig({
  plugins: [vue(), appVersionPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://uniballcloud.com',
        // target: 'https://h5.fqphysical.com',
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: { '*': '' },
        cookiePathRewrite: { '*': '/' },
      },
    },
  },
});

// import react from '@vitejs/plugin-react';
// import { defineConfig } from 'vite';

// // https://vitejs.dev/config/
// export default defineConfig({
//   plugins: [react()],
// });

//! TODO reference (2023-03-17) https://vite-pwa-org.netlify.app/guide/
//  https://github.com/vite-pwa/vite-plugin-pwa/blob/main/examples/react-router/vite.config.ts
// https://adueck.github.io/blog/caching-everything-for-totally-offline-pwa-vite-react/

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
// import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
});

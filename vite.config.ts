import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [
    vue({
      template: {
        transformAssetUrls: {
          base: null,
          includeAbsolute: false,
        },
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Compatibility shim: the extracted app imports `@inertiajs/vue3`
      // for Link / router / usePage. We map those onto Vue Router instead
      // of shipping Inertia. See src/shims/inertia.ts.
      '@inertiajs/vue3': fileURLToPath(
        new URL('./src/shims/inertia.ts', import.meta.url),
      ),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split large, stable vendor libs into separately-cacheable chunks
        // so a page change doesn't re-download the framework.
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          query: ['@tanstack/vue-query', '@tanstack/vue-table'],
          ui: ['reka-ui', 'vue-sonner', '@lucide/vue'],
        },
      },
    },
  },
  server: {
    // The SPA is cross-origin to the API and authenticates with Sanctum
    // BEARER tokens (withCredentials is false), so this origin must NOT be
    // listed in the backend's SANCTUM_STATEFUL_DOMAINS — doing so makes
    // Sanctum inject the web/CSRF stack into /api/* and every request 419s.
    port: 5173,
  },
});

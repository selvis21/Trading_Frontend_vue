import '@/css/app.css';
// vue-sonner 2.x ships its stylesheet separately and no longer auto-injects it.
// Without this import the Toaster renders unstyled. MUST be imported once here.
import 'vue-sonner/style.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { queryClient } from '@/lib/queryClient';
import router from '@/router';
import { vCan } from '@/directives/can';
import App from '@/App.vue';

/* ------------------------------------------------------------------ *
 * Standalone SPA bootstrap (replaces the Inertia app.ts).
 * Wires Vue Router, Pinia, Vue Query, and the v-can permission directive.
 * ------------------------------------------------------------------ */
const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, { queryClient });

app.directive('can', vCan);

app.mount('#app');

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { router } from '@inertiajs/vue3';
import AppShell from '@/components/shell/AppShell.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useAuthStore } from '@/stores/auth';
import { useMeQuery } from '@/queries/auth';
import { usePreferencesQuery } from '@/queries/profile';
import { onForbidden } from '@/services/api';

/* ------------------------------------------------------------------ *
 * Authenticated layout. Restores the session from the stored token via
 * the query layer (useMeQuery → /auth/me), pulls server preferences,
 * and guards unauthenticated / must-reset sessions. A global 403 routes
 * to the Forbidden page.
 * ------------------------------------------------------------------ */
const auth = useAuthStore();
const { settled, isError } = useMeQuery();
usePreferencesQuery(); // seeds theme/locale from the server once authed

const showApp = computed(() => settled.value && auth.isAuthenticated);

function guard() {
  if (!settled.value) return;
  if (!auth.isAuthenticated) {
    router.visit('/login');
  } else if (auth.mustUpdatePassword) {
    router.visit('/password/reset');
  }
}

onMounted(() => {
  onForbidden(() => router.visit('/403'));
  guard();
});
watch([settled, isError], guard);
</script>

<template>
  <AppShell v-if="showApp">
    <slot />
  </AppShell>
  <div v-else class="flex h-dvh items-center justify-center bg-bg">
    <Spinner label="Loading workspace…" />
  </div>
</template>

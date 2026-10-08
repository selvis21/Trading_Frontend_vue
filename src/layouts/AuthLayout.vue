<script setup lang="ts">
import { onMounted } from 'vue';
import AppLogo from '@/components/shell/AppLogo.vue';
import { BRAND_COMPANY, BRAND_NAME } from '@/lib/brand';
import { useUiStore } from '@/stores/ui';

/* Split auth shell: branded marketing panel + focused form column.
 * The panel is BP Prime gold with the official charcoal lockup laid straight
 * onto it (6.87:1 contrast), so no plate is needed on gold. */
const ui = useUiStore();
onMounted(() => ui.applyToDocument());
</script>

<template>
  <div class="flex min-h-dvh bg-bg text-fg">
    <!-- brand panel -->
    <div
      class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand p-12 text-brand-ink lg:flex"
    >
      <div
        class="absolute inset-0 opacity-25"
        style="
          background-image: radial-gradient(
            circle at 20% 20%,
            white 0,
            transparent 40%
          );
        "
      />
      <!-- {/* The lockup's diamond mark is the same gold as this panel, so it
          would vanish without the white plate. */} -->
      <div class="relative flex items-center gap-3">
        <AppLogo variant="full" :height="28" plate />
        <span class="sr-only">{{ BRAND_NAME }}</span>
      </div>
      <div class="relative max-w-md">
        <h2 class="text-2xl font-semibold leading-snug">
          The operations console for modern brokerages.
        </h2>
        <p class="mt-3 text-sm text-brand-ink/90">
          Leads, compliance, trading accounts and money movement — one
          permission-aware workspace.
        </p>
      </div>
      <div class="relative text-xs text-brand-ink/85">
        © {{ new Date().getFullYear() }} {{ BRAND_COMPANY }} · {{ BRAND_NAME }}
      </div>
    </div>

    <!-- form column: the lockup carries the brand on small screens, where
         the gold panel is hidden -->
    <div class="flex w-full flex-col items-center justify-center gap-8 p-6 lg:w-1/2">
      <div class="flex justify-center lg:hidden">
        <AppLogo variant="full" :height="26" plate />
      </div>
      <div class="w-full max-w-sm">
        <slot />
      </div>
    </div>
  </div>
</template>
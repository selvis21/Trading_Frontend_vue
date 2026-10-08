<script setup lang="ts">
import { Toaster } from 'vue-sonner';
import { computed } from 'vue';
import { useUiStore } from '@/stores/ui';

/* Global toast surface (Sonner), themed to the app + density. */
const ui = useUiStore();
const theme = computed(() => (ui.isDark ? 'dark' : 'light'));
</script>

<template>
  <Toaster
    :theme="theme"
    rich-colors
    close-button
    position="top-right"
    :duration="4000"
    :toast-options="{
      class: 'rounded-lg shadow-lg',
    }"
  />
</template>

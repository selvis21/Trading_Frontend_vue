<script setup lang="ts">
import { RouterView } from 'vue-router';
import Toaster from '@/components/ui/Toaster.vue';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

/* Root shell: the routed page tree plus app-global overlays (toasts +
 * the singleton confirm dialog), mirroring the former Inertia setup. */
</script>

<template>
  <RouterView />
  <Toaster />
  <ConfirmDialog />
</template>

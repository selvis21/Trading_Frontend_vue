<script setup lang="ts">
import { computed } from 'vue';
import { useIsFetching, useIsMutating } from '@tanstack/vue-query';

/* Slim top progress bar that reflects in-flight Vue Query activity
 * (and, via app.ts, Inertia navigations). Linear/Stripe-style. */
const fetching = useIsFetching();
const mutating = useIsMutating();
const active = computed(() => fetching.value > 0 || mutating.value > 0);
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-150"
    leave-active-class="transition-opacity duration-300"
    enter-from-class="opacity-0"
    leave-to-class="opacity-0"
  >
    <div
      v-show="active"
      class="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
      role="progressbar"
      aria-label="Loading"
    >
      <div class="loading-bar h-full w-full animate-pulse" />
      <div
        class="loading-bar absolute inset-y-0 left-0 w-1/3 animate-[loading_1.2s_ease-in-out_infinite]"
        style="
          animation-name: loadingSlide;
        "
      />
    </div>
  </Transition>
</template>

<style scoped>
@keyframes loadingSlide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}
</style>

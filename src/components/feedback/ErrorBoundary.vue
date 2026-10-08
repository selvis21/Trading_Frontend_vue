<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue';
import ErrorState from './ErrorState.vue';

/* Component-tree error boundary. Catches render/lifecycle errors in the
 * default slot and shows a recoverable fallback instead of a white screen. */
const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  error.value = err as Error;
  // Swallow so it doesn't propagate to the global handler & blank the app.
  return false;
});

function reset() {
  error.value = null;
}
</script>

<template>
  <ErrorState
    v-if="error"
    title="This section failed to render"
    :description="error.message"
    @retry="reset"
  />
  <slot v-else />
</template>

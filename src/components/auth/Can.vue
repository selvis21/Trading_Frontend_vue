<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

/* Slot-based permission gate. Unlike the v-can directive (which removes
 * an element), <Can> also offers a #fallback slot — useful for showing a
 * disabled affordance or an explanatory note instead of nothing.
 *
 *   <Can permission="finance.approve"> …button… </Can>
 *   <Can :any-of="['a','b']"> … <template #fallback> … </template></Can>
 */
const props = defineProps<{
  permission?: string;
  anyOf?: string[];
  allOf?: string[];
}>();

const auth = useAuthStore();
const allowed = computed(() => {
  if (props.permission) return auth.can(props.permission);
  if (props.allOf) return auth.canAll(props.allOf);
  if (props.anyOf) return auth.canAny(props.anyOf);
  return true;
});
</script>

<template>
  <slot v-if="allowed" />
  <slot v-else name="fallback" />
</template>

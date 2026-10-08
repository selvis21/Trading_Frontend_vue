<script setup lang="ts">
import { computed } from 'vue';
import { ShieldAlert } from '@lucide/vue';
import Badge from '@/components/ui/Badge.vue';
import type { StatusTone } from '@/types';

/* Risk-level indicator. risk_level is a free string on the backend, so
 * we map common values and default to neutral. */
const props = defineProps<{ risk: string | null | undefined }>();

const tone = computed<StatusTone>(() => {
  switch ((props.risk ?? '').toLowerCase()) {
    case 'high':
    case 'critical':
      return 'danger';
    case 'medium':
      return 'warning';
    case 'low':
      return 'success';
    default:
      return 'neutral';
  }
});
const label = computed(() =>
  props.risk ? props.risk[0].toUpperCase() + props.risk.slice(1) : 'Unrated',
);
</script>

<template>
  <Badge :tone="tone">
    <ShieldAlert class="size-3" /> {{ label }} risk
  </Badge>
</template>

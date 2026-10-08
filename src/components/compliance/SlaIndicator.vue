<script setup lang="ts">
import { computed } from 'vue';
import { Clock } from '@lucide/vue';
import { cn } from '@/lib/utils';

/* SLA age indicator for a submitted application. Green < 1d, amber < 3d,
 * red beyond — surfaces aging review work. */
const props = defineProps<{ since: string | null | undefined; thresholdHours?: number }>();

const hours = computed(() => {
  if (!props.since) return null;
  return (Date.now() - new Date(props.since).getTime()) / 3.6e6;
});
const tone = computed(() => {
  const h = hours.value;
  if (h == null) return 'neutral';
  const t = props.thresholdHours ?? 72;
  if (h < t / 3) return 'ok';
  if (h < t) return 'warn';
  return 'breach';
});
const label = computed(() => {
  const h = hours.value;
  if (h == null) return '—';
  if (h < 1) return '<1h';
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
});
const cls: Record<string, string> = {
  neutral: 'bg-muted-surface text-muted',
  ok: 'bg-status-success/10 text-status-success',
  warn: 'bg-status-warning/10 text-status-warning',
  breach: 'bg-status-danger/10 text-status-danger',
};
</script>

<template>
  <span
    :class="cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums', cls[tone])"
    :title="since ? `In queue since ${new Date(since).toLocaleString()}` : 'Not submitted'"
  >
    <Clock class="size-3" /> {{ label }}
  </span>
</template>

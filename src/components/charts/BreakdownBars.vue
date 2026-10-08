<script setup lang="ts">
import { computed } from 'vue';
import { cn, formatCompact } from '@/lib/utils';
import type { StatusTone } from '@/types';

/* Horizontal labelled bars for a {category: count} breakdown
 * (Stripe/Tremor style). Sorted desc, bar width relative to the max. */
const props = defineProps<{
  data: Record<string, number>;
  tone?: StatusTone;
  limit?: number;
  clickable?: boolean;
}>();
const emit = defineEmits<{ select: [key: string] }>();

const rows = computed(() => {
  const entries = Object.entries(props.data ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const limited = props.limit ? entries.slice(0, props.limit) : entries;
  const max = Math.max(1, ...limited.map(([, v]) => v));
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return limited.map(([label, value]) => ({
    label,
    value,
    pct: Math.round((value / max) * 100),
    share: Math.round((value / total) * 100),
  }));
});

const barTone: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral/70',
  info: 'bg-status-info/70',
  warning: 'bg-status-warning/70',
  success: 'bg-status-success/70',
  danger: 'bg-status-danger/70',
  accent: 'bg-status-accent/70',
};
</script>

<template>
  <div v-if="rows.length" class="space-y-2.5">
    <component
      :is="clickable ? 'button' : 'div'"
      v-for="row in rows"
      :key="row.label"
      :class="
        cn(
          'group block w-full text-start',
          clickable && 'cursor-pointer',
        )
      "
      @click="clickable && emit('select', row.label)"
    >
      <div class="mb-1 flex items-center justify-between gap-2 text-xs">
        <span class="truncate font-medium text-fg">{{ row.label }}</span>
        <span class="shrink-0 tabular-nums text-muted">
          {{ formatCompact(row.value) }}
          <span class="ms-1 text-[10px]">({{ row.share }}%)</span>
        </span>
      </div>
      <div class="h-2 overflow-hidden rounded-full bg-muted-surface">
        <div
          :class="
            cn(
              'h-full rounded-full transition-all duration-500',
              barTone[tone ?? 'info'],
              clickable && 'group-hover:opacity-80',
            )
          "
          :style="{ width: `${row.pct}%` }"
        />
      </div>
    </component>
  </div>
  <p v-else class="py-4 text-center text-sm text-muted">No data in range.</p>
</template>

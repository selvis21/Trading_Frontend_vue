<script setup lang="ts">
import { computed } from 'vue';
import { formatCompact } from '@/lib/utils';
import type { StatusTone } from '@/types';
import { toneForStatus } from '@/composables/useStatusTone';

/* SVG donut for a {category: count} distribution. Categories are mapped
 * to the canonical status palette so a "verified" slice is always green. */
const props = defineProps<{
  data: Record<string, number>;
  /** Override the auto status→tone mapping per category if needed. */
  total?: number;
}>();

const toneColor: Record<StatusTone, string> = {
  neutral: 'var(--status-neutral)',
  info: 'var(--status-info)',
  warning: 'var(--status-warning)',
  success: 'var(--status-success)',
  danger: 'var(--status-danger)',
  accent: 'var(--status-accent)',
};

const segments = computed(() => {
  const entries = Object.entries(props.data ?? {}).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let offset = 0;
  const C = 2 * Math.PI * 42; // r = 42
  return {
    total,
    items: entries.map(([label, value]) => {
      const frac = value / total;
      const seg = {
        label,
        value,
        color: `hsl(${toneColor[toneForStatus(label)]})`,
        dash: `${frac * C} ${C - frac * C}`,
        offset: -offset * C,
        share: Math.round(frac * 100),
      };
      offset += frac;
      return seg;
    }),
  };
});
</script>

<template>
  <div v-if="segments.total > 0" class="flex items-center gap-5">
    <div class="relative size-28 shrink-0">
      <svg viewBox="0 0 100 100" class="-rotate-90">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="hsl(var(--muted-surface))"
          stroke-width="12"
        />
        <circle
          v-for="seg in segments.items"
          :key="seg.label"
          cx="50"
          cy="50"
          r="42"
          fill="none"
          :stroke="seg.color"
          stroke-width="12"
          :stroke-dasharray="seg.dash"
          :stroke-dashoffset="seg.offset"
          class="transition-all duration-500"
        />
      </svg>
      <div
        class="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span class="text-lg font-semibold tabular-nums text-fg">
          {{ formatCompact(segments.total) }}
        </span>
        <span class="text-[10px] uppercase tracking-wide text-muted">total</span>
      </div>
    </div>
    <ul class="min-w-0 flex-1 space-y-1.5">
      <li
        v-for="seg in segments.items"
        :key="seg.label"
        class="flex items-center gap-2 text-xs"
      >
        <span
          class="size-2.5 shrink-0 rounded-full"
          :style="{ backgroundColor: seg.color }"
        />
        <span class="truncate text-fg">{{ seg.label }}</span>
        <span class="ms-auto shrink-0 tabular-nums text-muted">
          {{ seg.value }} · {{ seg.share }}%
        </span>
      </li>
    </ul>
  </div>
  <p v-else class="py-4 text-center text-sm text-muted">No data in range.</p>
</template>

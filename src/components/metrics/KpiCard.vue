<script setup lang="ts">
import { computed, type Component } from 'vue';
import { ArrowUpRight, ArrowDownRight, ArrowRight } from '@lucide/vue';
import { cn } from '@/lib/utils';

/* Dashboard KPI tile — value + trend delta + optional sparkline slot +
 * drill-through. Numbers use tabular figures. */
const props = defineProps<{
  label: string;
  value: string | number;
  /** Signed percentage delta vs the comparison period. */
  delta?: number;
  deltaLabel?: string;
  icon?: Component;
  href?: string;
  /** When true, a positive delta is bad (e.g. overdue count). */
  invertDelta?: boolean;
}>();

const trend = computed(() => {
  if (props.delta === undefined || props.delta === 0) return 'flat';
  return props.delta > 0 ? 'up' : 'down';
});
const positive = computed(() =>
  props.invertDelta ? trend.value === 'down' : trend.value === 'up',
);
const trendIcon = computed(() =>
  trend.value === 'up'
    ? ArrowUpRight
    : trend.value === 'down'
      ? ArrowDownRight
      : ArrowRight,
);
const Tag = computed(() => (props.href ? 'a' : 'div'));
</script>

<template>
  <component
    :is="Tag"
    :href="href"
    :class="
      cn(
        'group block rounded-lg border border-border bg-surface p-4 transition-shadow',
        href && 'hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )
    "
  >
    <div class="flex items-start justify-between">
      <span class="text-xs font-medium uppercase tracking-wide text-muted">
        {{ label }}
      </span>
      <component
        :is="icon"
        v-if="icon"
        class="size-4 text-muted transition-colors group-hover:text-primary"
      />
    </div>
    <div class="mt-2 flex items-end justify-between gap-3">
      <span class="text-2xl font-semibold tabular-nums text-fg">
        {{ value }}
      </span>
      <span
        v-if="delta !== undefined"
        :class="
          cn(
            'inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium tabular-nums',
            trend === 'flat'
              ? 'bg-muted-surface text-muted'
              : positive
                ? 'bg-status-success/10 text-status-success'
                : 'bg-status-danger/10 text-status-danger',
          )
        "
      >
        <component :is="trendIcon" class="size-3" />
        {{ Math.abs(delta) }}%
      </span>
    </div>
    <p v-if="deltaLabel" class="mt-1 text-xs text-muted">{{ deltaLabel }}</p>
    <div v-if="$slots.chart" class="mt-3 h-10">
      <slot name="chart" />
    </div>
  </component>
</template>

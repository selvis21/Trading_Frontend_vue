<script setup lang="ts">
import { computed } from 'vue';
import { cn, formatCompact } from '@/lib/utils';

/* Conversion funnel — ordered stages with width proportional to the top
 * stage and step-over-step conversion %. */
interface Stage {
  label: string;
  value: number;
}
const props = defineProps<{ stages: Stage[] }>();

const rows = computed(() => {
  const top = Math.max(1, props.stages[0]?.value ?? 1);
  return props.stages.map((s, i) => {
    const prev = props.stages[i - 1]?.value;
    return {
      ...s,
      width: Math.max(6, Math.round((s.value / top) * 100)),
      conv:
        prev && prev > 0 ? Math.round((s.value / prev) * 100) : null,
      overall: Math.round((s.value / top) * 100),
    };
  });
});
</script>

<template>
  <div v-if="stages.length" class="space-y-1.5">
    <div v-for="(row, i) in rows" :key="row.label">
      <div class="mb-1 flex items-center justify-between text-xs">
        <span class="font-medium text-fg">{{ row.label }}</span>
        <span class="tabular-nums text-muted">
          {{ formatCompact(row.value) }}
          <span v-if="row.conv !== null" class="ms-1 text-status-success">
            · {{ row.conv }}%
          </span>
        </span>
      </div>
      <div class="flex">
        <div
          :class="
            cn(
              'flex h-8 items-center justify-end rounded-md px-2 text-[11px] font-medium transition-all duration-500',
              i === 0
                ? 'bg-brand text-brand-ink'
                : i === rows.length - 1
                  ? 'bg-status-success text-on-status'
                  : 'bg-primary text-primary-fg',
            )
          "
          :style="{ width: `${row.width}%` }"
        >
          {{ row.overall }}%
        </div>
      </div>
    </div>
  </div>
  <p v-else class="py-4 text-center text-sm text-muted">No funnel data.</p>
</template>

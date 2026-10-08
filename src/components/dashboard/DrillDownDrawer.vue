<script setup lang="ts">
import { computed } from 'vue';
import Drawer from '@/components/ui/Drawer.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';
import type { StatusTone } from '@/types';

/* Generic breakdown drill-down: shows the full {category: count} dataset
 * as a ranked table + bars, with totals. Opened from any visualization. */
const props = defineProps<{
  open: boolean;
  title: string;
  data: Record<string, number>;
  tone?: StatusTone;
}>();
const emit = defineEmits<{ 'update:open': [value: boolean] }>();

const rows = computed(() =>
  Object.entries(props.data ?? {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]),
);
const total = computed(() => rows.value.reduce((s, [, v]) => s + v, 0));
</script>

<template>
  <Drawer
    :open="props.open"
    :title="props.title"
    :description="`${total} total across ${rows.length} categories`"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <BreakdownBars :data="props.data" :tone="props.tone" />

      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th class="py-2 text-start font-medium">Category</th>
            <th class="py-2 text-end font-medium">Count</th>
            <th class="py-2 text-end font-medium">Share</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="[label, value] in rows"
            :key="label"
            class="border-b border-border last:border-0"
          >
            <td class="py-2 text-fg">{{ label }}</td>
            <td class="py-2 text-end tabular-nums text-fg">{{ value }}</td>
            <td class="py-2 text-end tabular-nums text-muted">
              {{ Math.round((value / total) * 100) }}%
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Drawer>
</template>

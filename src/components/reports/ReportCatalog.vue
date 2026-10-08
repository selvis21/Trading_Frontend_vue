<script setup lang="ts">
import { computed } from 'vue';
import { router } from '@inertiajs/vue3';
import { Download } from '@lucide/vue';
import Badge from '@/components/ui/Badge.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn } from '@/lib/utils';
import { categoryIcon, categoryTone } from './reportMeta';
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/types/reports';
import type { ReportCatalogEntry } from '@/types/reports';
import type { StatusTone } from '@/types';

// Static tone → classes map (Tailwind JIT can't see interpolated class names).
const toneChip: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral/10 text-status-neutral',
  info: 'bg-status-info/10 text-status-info',
  warning: 'bg-status-warning/10 text-status-warning',
  success: 'bg-status-success/10 text-status-success',
  danger: 'bg-status-danger/10 text-status-danger',
  accent: 'bg-status-accent/10 text-status-accent',
};

/* Report catalogue grouped by category. Each card deep-links to the report
 * viewer. Only reports the user can run are returned by the API. */
const props = defineProps<{
  reports: ReportCatalogEntry[];
  loading?: boolean;
}>();

const grouped = computed(() => {
  const map = new Map<string, ReportCatalogEntry[]>();
  for (const r of props.reports) {
    const list = map.get(r.category) ?? [];
    list.push(r);
    map.set(r.category, list);
  }
  const order = [...CATEGORY_ORDER, ...[...map.keys()].filter((c) => !CATEGORY_ORDER.includes(c))];
  return order
    .filter((c) => map.has(c))
    .map((c) => ({ category: c, label: CATEGORY_LABEL[c] ?? c, reports: map.get(c)! }));
});

function open(report: ReportCatalogEntry) {
  router.visit(`/reports/view/${report.key}`);
}
</script>

<template>
  <div>
    <div v-if="loading" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <SkeletonCard v-for="i in 6" :key="i" />
    </div>
    <EmptyState
      v-else-if="!reports.length"
      title="No reports available"
      description="You don't have access to any reports yet."
    />
    <div v-else class="space-y-6">
      <section v-for="group in grouped" :key="group.category">
        <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
          <component :is="categoryIcon(group.category)" class="size-4 text-muted" />
          {{ group.label }}
          <span class="text-xs font-normal text-muted">({{ group.reports.length }})</span>
        </h2>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="r in group.reports"
            :key="r.key"
            :class="
              cn(
                'group flex flex-col rounded-lg border border-border bg-surface p-4 text-start transition-shadow hover:shadow-sm',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )
            "
            @click="open(r)"
          >
            <div class="flex items-start justify-between gap-2">
              <span
                :class="cn('flex size-9 items-center justify-center rounded-md', toneChip[categoryTone(r.category)])"
              >
                <component :is="categoryIcon(r.category)" class="size-4" />
              </span>
              <Badge v-if="r.exportable" tone="neutral"><Download class="size-3" /> CSV</Badge>
            </div>
            <h3 class="mt-3 text-sm font-medium text-fg group-hover:text-primary">{{ r.title }}</h3>
            <p class="mt-0.5 font-mono text-xs text-muted" dir="ltr">{{ r.key }}</p>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { TriangleAlert, Info, OctagonAlert, ChevronRight } from '@lucide/vue';
import WidgetCard from './WidgetCard.vue';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/queries/dashboard';
import type { AlertLevel } from '@/types/dashboard';

/* System / compliance / finance alerts, ranked by severity. */
const q = useAlerts();

const sorted = computed(() => {
  const rank: Record<AlertLevel, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  return [...(q.data.value ?? [])].sort(
    (a, b) => rank[a.level] - rank[b.level],
  );
});

const meta: Record<
  AlertLevel,
  { icon: typeof Info; chip: string; text: string }
> = {
  critical: {
    icon: OctagonAlert,
    chip: 'bg-status-danger/10 text-status-danger',
    text: 'text-status-danger',
  },
  warning: {
    icon: TriangleAlert,
    chip: 'bg-status-warning/10 text-status-warning',
    text: 'text-status-warning',
  },
  info: {
    icon: Info,
    chip: 'bg-status-info/10 text-status-info',
    text: 'text-status-info',
  },
};
</script>

<template>
  <WidgetCard
    title="Alerts"
    subtitle="Things that may need attention"
    :icon="TriangleAlert"
    :loading="q.isLoading.value"
    :error="q.isError.value"
    :empty="q.isSuccess.value && !sorted.length"
    empty-text="No active alerts"
    skeleton="lines"
    @retry="q.refetch()"
  >
    <ul class="-my-1 divide-y divide-border">
      <li v-for="alert in sorted" :key="alert.key">
        <component
          :is="alert.link ? Link : 'div'"
          :href="alert.link ?? undefined"
          class="group flex items-start gap-3 py-2.5"
          :class="alert.link && 'cursor-pointer'"
        >
          <span
            :class="
              cn(
                'flex size-7 shrink-0 items-center justify-center rounded-md',
                meta[alert.level].chip,
              )
            "
          >
            <component :is="meta[alert.level].icon" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-fg">{{ alert.message }}</p>
            <p
              v-if="alert.count !== null"
              :class="cn('text-xs font-medium tabular-nums', meta[alert.level].text)"
            >
              {{ alert.count }} item{{ alert.count === 1 ? '' : 's' }}
            </p>
          </div>
          <ChevronRight
            v-if="alert.link"
            class="mt-0.5 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5"
          />
        </component>
      </li>
    </ul>
  </WidgetCard>
</template>

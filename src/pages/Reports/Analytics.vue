<script setup lang="ts">
import { ref, computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, LineChart, CalendarRange } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import AnalyticsCard from '@/components/reports/AnalyticsCard.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { useAuthStore } from '@/stores/auth';
import {
  ANALYTICS_AREAS,
  REPORT_PERMISSION,
  type ReportFilters,
} from '@/types/reports';

/* Analytics overview — the five analytics areas (Lead Conversion, KYC
 * Performance, Trading Growth, Deposit/Withdrawal Trends, Activity Metrics),
 * each backed by a report key, under one shared date range. Areas the user
 * lacks the underlying domain permission for are hidden (so we never fire a
 * report that would 403). */
defineOptions({ layout: null });

const auth = useAuthStore();

const filters = ref<ReportFilters>({});

const areas = computed(() =>
  ANALYTICS_AREAS.filter((a) => {
    const perm = REPORT_PERMISSION[a.report_key];
    return !perm || auth.can(perm);
  }),
);

function patch(p: Partial<ReportFilters>) {
  filters.value = { ...filters.value, ...p };
}
const field =
  'rounded-md border border-input bg-surface px-3 py-1.5 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <Link href="/reports" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to reports
      </Link>

      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <LineChart class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Analytics</h1>
            <p class="text-sm text-muted">Conversion, KYC, trading, flows and activity at a glance.</p>
          </div>
        </div>
        <div class="flex items-center gap-2 text-sm">
          <CalendarRange class="size-4 text-muted" />
          <input
            type="date"
            :value="filters.from"
            :class="field"
            aria-label="From"
            @change="patch({ from: ($event.target as HTMLInputElement).value })"
          />
          <span class="text-muted">→</span>
          <input
            type="date"
            :value="filters.to"
            :class="field"
            aria-label="To"
            @change="patch({ to: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </header>

      <EmptyState
        v-if="!areas.length"
        :icon="LineChart"
        title="No analytics available"
        description="You don't have access to any analytics areas."
      />
      <div v-else class="grid gap-4 lg:grid-cols-2">
        <AnalyticsCard v-for="a in areas" :key="a.key" :area="a" :filters="filters" />
      </div>
    </div>
  </AppLayout>
</template>

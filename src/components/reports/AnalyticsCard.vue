<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowRight } from '@lucide/vue';
import ReportChart from './ReportChart.vue';
import DepositWithdrawalChart from '@/components/finance/DepositWithdrawalChart.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import ErrorState from '@/components/feedback/ErrorState.vue';
import { useReport } from '@/queries/reports';
import { humaniseKey } from '@/composables/useReportFormat';
import type { AnalyticsArea, ReportFilters } from '@/types/reports';

/* One analytics panel — runs an analytics report key and renders its
 * preferred visualization. The finance "flow" area reuses the
 * deposit-vs-withdrawal money chart (integer minor units). Permission is
 * enforced server-side; a 403 surfaces as an inline error, not a redirect-
 * worthy failure (the query is still gated by reports.view). */
const props = defineProps<{ area: AnalyticsArea; filters: ReportFilters }>();

const report = useReport(
  () => props.area.report_key,
  () => props.filters,
);

const dataset = computed(() => report.data.value);

// finance flow figures (minor units) from the summary, when present.
const deposits = computed(() => Number(dataset.value?.summary?.deposits_total ?? 0));
const withdrawals = computed(() => Number(dataset.value?.summary?.withdrawals_total ?? 0));

// A small headline metric: first summary entry (row count fallback).
const headline = computed(() => {
  const summary = dataset.value?.summary ?? {};
  const first = Object.entries(summary)[0];
  if (first) return { label: humaniseKey(first[0]), value: first[1] };
  return { label: 'Rows', value: dataset.value?.row_count ?? 0 };
});
</script>

<template>
  <section class="flex flex-col rounded-lg border border-border bg-surface p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <h3 class="text-sm font-semibold text-fg">{{ area.title }}</h3>
      <Link
        :href="`/reports/view/${area.report_key}`"
        class="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
      >
        Open <ArrowRight class="size-3.5" />
      </Link>
    </div>

    <SkeletonCard v-if="report.isLoading.value" />
    <ErrorState v-else-if="report.isError.value" @retry="report.refetch()" />
    <template v-else>
      <DepositWithdrawalChart
        v-if="area.chart === 'flow'"
        :deposits="deposits"
        :withdrawals="withdrawals"
      />
      <ReportChart v-else :dataset="dataset" :prefer="area.chart" />
      <p class="mt-3 border-t border-border pt-2 text-xs text-muted">
        {{ headline.label }}:
        <span class="font-medium text-fg tabular-nums">{{ headline.value }}</span>
      </p>
    </template>
  </section>
</template>

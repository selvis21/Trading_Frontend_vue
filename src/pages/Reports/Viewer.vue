<script setup lang="ts">
import { ref, computed, watch, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import { useUrlSearchParams } from '@vueuse/core';
import { ArrowLeft, Table2, BarChart3, Gauge, Clock, CalendarPlus } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import Spinner from '@/components/ui/Spinner.vue';
import ReportFilterPanel from '@/components/reports/ReportFilterPanel.vue';
import ReportTable from '@/components/reports/ReportTable.vue';
import ReportChart from '@/components/reports/ReportChart.vue';
import ReportKpiSummary from '@/components/reports/ReportKpiSummary.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useReport, useReportCatalog, useExportReport } from '@/queries/reports';
import { useReportHistory } from '@/composables/useReportHistory';
import type { ReportFilters } from '@/types/reports';

/* Report viewer — runs a report key with Table / Chart / KPI views, CSV
 * export, and "save as scheduled". Filters persist to the URL query
 * (shareable / refresh-safe) so the run is reproducible. */
defineOptions({ layout: null });

const props = defineProps<{ reportKey: string }>();

const ScheduleDrawer = defineAsyncComponent(
  () => import('@/components/reports/ScheduleDrawer.vue'),
);

const auth = useAuthStore();
const toast = useToast();
const catalog = useReportCatalog();
const exportReport = useExportReport();
const { saveView, pushRecent, pushExport } = useReportHistory();

const entry = computed(() =>
  catalog.data.value?.find((r) => r.key === props.reportKey),
);

// Query persistence: filters live in the URL search params.
const urlParams = useUrlSearchParams<Record<string, string>>('history');
const filters = ref<ReportFilters>({
  from: urlParams.from || undefined,
  to: urlParams.to || undefined,
  business_unit_id: urlParams.business_unit_id ? Number(urlParams.business_unit_id) : null,
  domain: urlParams.domain || undefined,
});

function syncUrl() {
  urlParams.from = filters.value.from ?? '';
  urlParams.to = filters.value.to ?? '';
  urlParams.business_unit_id =
    filters.value.business_unit_id != null ? String(filters.value.business_unit_id) : '';
  urlParams.domain = filters.value.domain ?? '';
}

const report = useReport(() => props.reportKey, filters);
const dataset = computed(() => report.data.value);

const rowFilter = ref('');
type View = 'table' | 'chart' | 'kpi';
const view = ref<View>('table');
const views: { key: View; label: string; icon: typeof Table2 }[] = [
  { key: 'table', label: 'Table', icon: Table2 },
  { key: 'chart', label: 'Chart', icon: BarChart3 },
  { key: 'kpi', label: 'KPI Summary', icon: Gauge },
];

// Record a recent-report entry once the report resolves.
watch(
  () => dataset.value?.key,
  (key) => {
    if (key && dataset.value) pushRecent(key, dataset.value.title);
  },
);

function onFilters(next: ReportFilters) {
  filters.value = next;
}
function run() {
  syncUrl();
  report.refetch();
}

function onSave() {
  const name = window.prompt('Save this report view as:', entry.value?.title ?? props.reportKey);
  if (!name) return;
  saveView(name.trim(), props.reportKey, filters.value);
  toast.success('Report view saved');
}

function onExport() {
  const id = toast.loading('Preparing export…');
  exportReport.mutate(
    { key: props.reportKey, filters: filters.value },
    {
      onSuccess: ({ filename }) => {
        toast.dismiss(id);
        pushExport(props.reportKey, entry.value?.title ?? props.reportKey, filename);
        toast.success('Export downloaded');
      },
      onError: (e) => {
        toast.dismiss(id);
        toast.fromError(e);
      },
    },
  );
}

const scheduleOpen = ref(false);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl p-4 sm:p-6">
      <Link href="/reports" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to reports
      </Link>

      <header class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">
            {{ dataset?.title ?? entry?.title ?? reportKey }}
          </h1>
          <p class="font-mono text-xs text-muted" dir="ltr">{{ reportKey }}</p>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="dataset" class="hidden items-center gap-1 text-xs text-muted sm:inline-flex">
            <Clock class="size-3.5" /> {{ dataset.row_count }} rows · generated {{ timeAgo(dataset.generated_at) }}
          </span>
          <Button v-if="auth.can('reports.schedule')" variant="outline" size="sm" @click="scheduleOpen = true">
            <CalendarPlus class="size-4" /> Schedule
          </Button>
        </div>
      </header>

      <div class="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <!-- filter panel -->
        <ReportFilterPanel
          :report-key="reportKey"
          :filters="filters"
          :row-filter="rowFilter"
          :loading="report.isFetching.value"
          :exportable="entry?.exportable ?? true"
          :can-export="auth.can('reports.export')"
          :can-schedule="auth.can('reports.schedule')"
          @update:filters="onFilters"
          @update:row-filter="rowFilter = $event"
          @run="run"
          @save="onSave"
          @export="onExport"
        />

        <!-- results -->
        <div class="min-w-0 space-y-3">
          <!-- view switcher -->
          <div class="flex gap-1">
            <button
              v-for="v in views"
              :key="v.key"
              :class="
                cn(
                  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  view === v.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
                )
              "
              @click="view = v.key"
            >
              <component :is="v.icon" class="size-4" /> {{ v.label }}
            </button>
          </div>

          <div v-if="report.isLoading.value && !dataset" class="flex h-64 items-center justify-center">
            <Spinner label="Running report…" />
          </div>

          <template v-else>
            <ReportTable
              v-if="view === 'table'"
              :dataset="dataset"
              :loading="report.isFetching.value"
              :error="report.isError.value"
              :row-filter="rowFilter"
              @retry="report.refetch()"
            />
            <div v-else-if="view === 'chart'" class="rounded-lg border border-border bg-surface p-4">
              <ReportChart :dataset="dataset" prefer="auto" />
            </div>
            <ReportKpiSummary v-else :dataset="dataset" />
          </template>
        </div>
      </div>
    </div>

    <ScheduleDrawer
      :open="scheduleOpen"
      :preset-report-key="reportKey"
      :preset-filters="filters"
      @update:open="scheduleOpen = $event"
    />
  </AppLayout>
</template>

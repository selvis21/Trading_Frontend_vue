<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  FileBarChart,
  Bookmark,
  History,
  CalendarClock,
  CalendarPlus,
  Download,
  ArrowRight,
  LineChart,
} from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import ReportCatalog from '@/components/reports/ReportCatalog.vue';
import SavedReportsList from '@/components/reports/SavedReportsList.vue';
import RecentReportsList from '@/components/reports/RecentReportsList.vue';
import ScheduledReportsList from '@/components/reports/ScheduledReportsList.vue';
import { useAuthStore } from '@/stores/auth';
import { useReportCatalog } from '@/queries/reports';
import type { ScheduledReport } from '@/types/reports';

/* Reports home — the launchpad. Report Catalog (primary) alongside Saved,
 * Recent and Scheduled sections. Schedule create/edit + export history are
 * drawer-first and lazy-loaded. */
defineOptions({ layout: null });

const ScheduleDrawer = defineAsyncComponent(
  () => import('@/components/reports/ScheduleDrawer.vue'),
);
const ExportHistoryDrawer = defineAsyncComponent(
  () => import('@/components/reports/ExportHistoryDrawer.vue'),
);

const auth = useAuthStore();
const catalog = useReportCatalog();

const scheduleOpen = ref(false);
const editing = ref<ScheduledReport | null>(null);
const historyOpen = ref(false);

function newSchedule() {
  editing.value = null;
  scheduleOpen.value = true;
}
function editSchedule(schedule: ScheduledReport) {
  editing.value = schedule;
  scheduleOpen.value = true;
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <FileBarChart class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Reports</h1>
            <p class="text-sm text-muted">Run, save, schedule and export reports.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Link href="/reports/analytics">
            <Button variant="outline" size="sm"><LineChart class="size-4" /> Analytics</Button>
          </Link>
          <Button variant="outline" size="sm" @click="historyOpen = true">
            <Download class="size-4" /> Exports
          </Button>
          <Button v-if="auth.can('reports.schedule')" size="sm" @click="newSchedule">
            <CalendarPlus class="size-4" /> New schedule
          </Button>
        </div>
      </header>

      <div class="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <!-- Report Catalog (primary) -->
        <section class="min-w-0">
          <ReportCatalog :reports="catalog.data.value ?? []" :loading="catalog.isLoading.value" />
        </section>

        <!-- side sections -->
        <aside class="space-y-6">
          <section>
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
              <Bookmark class="size-4 text-muted" /> Saved Reports
            </h2>
            <SavedReportsList />
          </section>

          <section>
            <h2 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
              <History class="size-4 text-muted" /> Recent Reports
            </h2>
            <RecentReportsList />
          </section>

          <section v-if="auth.can('reports.schedule')">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="flex items-center gap-1.5 text-sm font-semibold text-fg">
                <CalendarClock class="size-4 text-muted" /> Scheduled
              </h2>
              <Link href="/reports/scheduled" class="inline-flex items-center gap-0.5 text-xs text-muted hover:text-fg">
                All <ArrowRight class="size-3.5" />
              </Link>
            </div>
            <ScheduledReportsList @edit="editSchedule" />
          </section>
        </aside>
      </div>
    </div>

    <ScheduleDrawer
      :open="scheduleOpen"
      :schedule="editing"
      @update:open="scheduleOpen = $event"
    />
    <ExportHistoryDrawer :open="historyOpen" @update:open="historyOpen = $event" />
  </AppLayout>
</template>

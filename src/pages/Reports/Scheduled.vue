<script setup lang="ts">
import { ref, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, CalendarClock, CalendarPlus } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import ScheduledReportsList from '@/components/reports/ScheduledReportsList.vue';
import type { ScheduledReport } from '@/types/reports';

/* Scheduled reports management — full CRUD (create / edit / delete /
 * enable-disable). The drawer handles create + edit. */
defineOptions({ layout: null });

const ScheduleDrawer = defineAsyncComponent(
  () => import('@/components/reports/ScheduleDrawer.vue'),
);

const scheduleOpen = ref(false);
const editing = ref<ScheduledReport | null>(null);

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
    <div class="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <Link href="/reports" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to reports
      </Link>

      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <CalendarClock class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Scheduled Reports</h1>
            <p class="text-sm text-muted">Recurring report delivery (CSV by email).</p>
          </div>
        </div>
        <Button size="sm" @click="newSchedule">
          <CalendarPlus class="size-4" /> New schedule
        </Button>
      </header>

      <ScheduledReportsList @edit="editSchedule" />
    </div>

    <ScheduleDrawer :open="scheduleOpen" :schedule="editing" @update:open="scheduleOpen = $event" />
  </AppLayout>
</template>

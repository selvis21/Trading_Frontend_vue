<script setup lang="ts">
import { computed, defineAsyncComponent, h } from 'vue';
import { RefreshCw } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import DashboardKpi from '@/components/dashboard/DashboardKpi.vue';
import PendingActionsPanel from '@/components/dashboard/PendingActionsPanel.vue';
import AlertsPanel from '@/components/dashboard/AlertsPanel.vue';
import QuickActions from '@/components/dashboard/QuickActions.vue';
import ActivityCenter from '@/components/dashboard/ActivityCenter.vue';
import SegmentedControl from '@/components/ui/SegmentedControl.vue';
import Button from '@/components/ui/Button.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import ForbiddenState from '@/components/feedback/ForbiddenState.vue';
import ErrorBoundary from '@/components/feedback/ErrorBoundary.vue';
import { useAuthStore } from '@/stores/auth';
import { useDashboardStore } from '@/stores/dashboard';
import {
  usePersonalDashboard,
  useRefreshDashboard,
} from '@/queries/dashboard';
import type { DashboardPeriod } from '@/types/dashboard';

defineOptions({ layout: null });

/* Lazy-loaded heavy sections (charts + the multi-query widget grid) so
 * the initial dashboard paint is light; chunks stream in after mount. */
const RoleWidgetGrid = defineAsyncComponent({
  loader: () => import('@/components/dashboard/sections/RoleWidgetGrid.vue'),
  loadingComponent: { render: () => h('div', { class: 'h-24' }) },
});
const InsightsGrid = defineAsyncComponent({
  loader: () => import('@/components/dashboard/sections/InsightsGrid.vue'),
  loadingComponent: { render: () => h('div', { class: 'h-64' }) },
});

const auth = useAuthStore();
const dash = useDashboardStore();
const refresh = useRefreshDashboard();
const personal = usePersonalDashboard();

const canSeeDashboard = computed(() => auth.can('dashboard.view'));

const greeting = computed(() => {
  const h = new Date().getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return `${part}, ${auth.user?.first_name ?? ''}`.trim();
});

const personalKpis = computed(() => personal.data.value?.default.kpis ?? []);
const kpiHref: Record<string, string> = {
  my_leads: '/leads',
  my_converted: '/leads/pipeline',
  my_followups: '/mentions',
};

const periods: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'qtd', label: 'QTD' },
];
const period = computed({
  get: () => dash.period,
  set: (v: DashboardPeriod) => dash.setPeriod(v),
});
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <!-- header -->
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold tracking-tight text-fg">
            {{ greeting }}
          </h1>
          <p class="text-sm text-muted">
            Here’s what needs you — {{ dash.periodLabel.toLowerCase() }}.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <SegmentedControl
            v-model="period"
            :options="periods"
            size="sm"
            aria-label="Period"
          />
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="Refresh"
            @click="refresh()"
          >
            <RefreshCw />
          </Button>
        </div>
      </header>

      <ForbiddenState
        v-if="!canSeeDashboard"
        title="No dashboard access"
        description="Your role doesn’t include dashboard.view."
      />

      <template v-else>
        <!-- personal KPIs -->
        <section class="space-y-3">
          <h2 class="sr-only">Your metrics</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <template v-if="personal.isLoading.value">
              <SkeletonCard v-for="i in 3" :key="i" />
            </template>
            <DashboardKpi
              v-for="k in personalKpis"
              v-else
              :key="k.key"
              :kpi="k"
              :href="kpiHref[k.key]"
            />
          </div>
        </section>

        <!-- role-aware widgets (lazy chunk) -->
        <ErrorBoundary>
          <RoleWidgetGrid />
        </ErrorBoundary>

        <!-- operations center -->
        <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <PendingActionsPanel />
          <AlertsPanel />
          <QuickActions />
        </section>

        <!-- insights (lazy chunk) -->
        <ErrorBoundary>
          <InsightsGrid />
        </ErrorBoundary>

        <!-- activity center -->
        <ErrorBoundary>
          <ActivityCenter />
        </ErrorBoundary>
      </template>
    </div>
  </AppLayout>
</template>

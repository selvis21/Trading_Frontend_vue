<script setup lang="ts">
import { computed } from 'vue';
import { PieChart, Server, Layers } from '@lucide/vue';
import DonutChart from '@/components/charts/DonutChart.vue';
import BreakdownBars from '@/components/charts/BreakdownBars.vue';
import SkeletonCard from '@/components/skeleton/SkeletonCard.vue';
import {
  useTradingMetrics,
  useTradingPlatforms,
  useTradingAccounts,
} from '@/queries/trading';

/* Three distribution panels for the accounts overview:
 *  • Status breakdown — donut over accounts_by_status (palette-mapped).
 *  • By platform — bars over accounts_by_platform, ids resolved to names.
 *  • By group — derived from a wide accounts fetch (the metrics endpoint
 *    has no group rollup), grouped by group name. Best-effort over the
 *    loaded sample, capped at 500 accounts.
 */
const metrics = useTradingMetrics();
const platforms = useTradingPlatforms();
const sample = useTradingAccounts(() => ({ page_size: 500 }));

const statusData = computed(() => metrics.data.value?.accounts_by_status ?? {});

const platformName = computed(() => {
  const map: Record<string, string> = {};
  for (const p of platforms.data.value ?? []) map[String(p.id)] = p.name;
  return map;
});

const platformData = computed<Record<string, number>>(() => {
  const raw = metrics.data.value?.accounts_by_platform ?? {};
  const out: Record<string, number> = {};
  for (const [id, count] of Object.entries(raw)) {
    out[platformName.value[id] ?? `Platform #${id}`] = count;
  }
  return out;
});

const groupData = computed<Record<string, number>>(() => {
  const rows = sample.data.value?.rows ?? [];
  const out: Record<string, number> = {};
  for (const a of rows) {
    const g = a.group && 'name' in a.group ? a.group.name : null;
    const key = g ?? (a.trading_group_id ? `Group #${a.trading_group_id}` : 'Unassigned');
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
});

const loading = computed(() => metrics.isLoading.value);
</script>

<template>
  <div class="grid gap-4 lg:grid-cols-3">
    <SkeletonCard v-if="loading" />
    <section v-else class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <PieChart class="size-4 text-muted" /> Status breakdown
      </h3>
      <DonutChart :data="statusData" />
    </section>

    <SkeletonCard v-if="loading" />
    <section v-else class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Server class="size-4 text-muted" /> By platform
      </h3>
      <BreakdownBars :data="platformData" tone="info" :limit="6" />
    </section>

    <SkeletonCard v-if="loading" />
    <section v-else class="rounded-lg border border-border bg-surface p-4">
      <h3 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-fg">
        <Layers class="size-4 text-muted" /> By group
      </h3>
      <BreakdownBars :data="groupData" tone="accent" :limit="6" />
      <p class="mt-2 text-[11px] text-muted">Reflects up to 500 most recent accounts.</p>
    </section>
  </div>
</template>

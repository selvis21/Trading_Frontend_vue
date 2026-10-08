<script setup lang="ts">
import { computed, type Component } from 'vue';
import {
  Users,
  UserCheck,
  Percent,
  Waves,
  ShieldCheck,
  FileClock,
  FileX,
  LineChart,
  Layers,
  Banknote,
  ArrowDownToLine,
  ArrowUpFromLine,
  Activity,
  CircleDollarSign,
} from '@lucide/vue';
import KpiCard from '@/components/metrics/KpiCard.vue';
import { formatKpi } from '@/lib/utils';
import type { Kpi } from '@/types/dashboard';

/* Adapts an API Kpi → the presentational KpiCard: formats the value by
 * its declared format and maps the server icon hint to a Lucide glyph. */
const props = defineProps<{
  kpi: Kpi;
  href?: string;
  invertDelta?: boolean;
}>();

const ICONS: Record<string, Component> = {
  total_leads: Users,
  new_leads: Users,
  my_leads: Users,
  converted_leads: UserCheck,
  my_converted: UserCheck,
  conversion_rate: Percent,
  in_pool: Waves,
  my_followups: FileClock,
  verified: ShieldCheck,
  verified_clients: ShieldCheck,
  applications_under_review: FileClock,
  pending_documents: FileClock,
  rejected: FileX,
  active_accounts: LineChart,
  total_accounts: Layers,
  accounts_created: LineChart,
  pending_requests: FileClock,
  deposits_total: ArrowDownToLine,
  withdrawals_total: ArrowUpFromLine,
  net_flow: Banknote,
  pending_transactions: Activity,
};

const icon = computed<Component>(
  () => ICONS[props.kpi.key] ?? CircleDollarSign,
);
const value = computed(() =>
  formatKpi(props.kpi.value, props.kpi.format),
);
</script>

<template>
  <KpiCard
    :label="kpi.label"
    :value="value"
    :delta="kpi.delta ?? undefined"
    :icon="icon"
    :href="href"
    :invert-delta="invertDelta"
  />
</template>

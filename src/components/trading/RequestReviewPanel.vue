<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  CircleUserRound,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Server,
  Layers,
  Gauge,
} from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from './AccountTypePill.vue';
import RequestActions from './RequestActions.vue';
import StatCard from '@/components/metrics/StatCard.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useTradingRequest, useTradingPlatforms } from '@/queries/trading';
import { useClientKyc } from '@/queries/compliance';
import type { TradingAccountRequest } from '@/types/trading';

/* Review pane for a single open-account request. Surfaces the client's KYC
 * status — the gate for provisioning — and blocks approval with a clear
 * reason when it is not verified (the server enforces too). */
const props = defineProps<{ requestId: number; fallback?: TradingAccountRequest | null }>();
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const detail = useTradingRequest(() => props.requestId);
const request = computed<TradingAccountRequest | null>(
  () => detail.data.value ?? props.fallback ?? null,
);

// Gated behind compliance.view (null when not permitted) so the KYC gate
// fetch never trips the global 403 handler for a trading-only operator.
const kyc = useClientKyc(() =>
  auth.can('compliance.view') ? request.value?.client_id ?? null : null,
);
const kycVerified = computed(() => kyc.data.value?.status === 'verified');
// Only block when we can positively see an unverified KYC; if compliance is
// not visible to this operator we defer to the server.
const approveBlocked = computed(
  () => kyc.data.value != null && !kycVerified.value,
);

const platforms = useTradingPlatforms();
const platformName = computed(() => {
  const id = request.value?.trading_platform_id;
  return platforms.data.value?.find((p) => p.id === id)?.name ?? (id ? `Platform #${id}` : '—');
});

const details = computed(() => {
  const r = request.value;
  if (!r) return [];
  return [
    { icon: Server, label: 'Platform', value: platformName.value },
    { icon: Layers, label: 'Group', value: r.trading_group_id ? `#${r.trading_group_id}` : 'Operator assigns' },
    { icon: Gauge, label: 'Requested leverage', value: `1:${r.requested_leverage ?? '—'}` },
  ];
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div v-if="detail.isLoading.value && !request" class="flex h-full items-center justify-center">
      <Spinner label="Loading request…" />
    </div>

    <div v-else-if="request" class="min-h-0 flex-1 overflow-y-auto p-4">
      <header class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-fg">Request #{{ request.id }}</h2>
            <AccountTypePill :type="request.account_type" />
            <StatusBadge :status="request.status" />
          </div>
          <p class="mt-0.5 text-sm text-muted">Submitted {{ timeAgo(request.created_at) }}</p>
        </div>
      </header>

      <!-- KYC gate -->
      <div
        :class="
          cn(
            'mt-4 flex items-center gap-2 rounded-lg border p-3 text-sm',
            kycVerified
              ? 'border-status-success/30 bg-status-success/5 text-status-success'
              : kyc.data.value
                ? 'border-status-warning/30 bg-status-warning/5 text-status-warning'
                : 'border-border bg-surface text-muted',
          )
        "
      >
        <component :is="kycVerified ? ShieldCheck : ShieldAlert" class="size-4 shrink-0" />
        <span v-if="kycVerified">KYC verified — eligible for an account.</span>
        <span v-else-if="kyc.data.value">
          KYC is <strong>{{ kyc.data.value.status }}</strong> — approval is blocked until verified.
        </span>
        <span v-else>KYC status unavailable in your scope; the server validates on approval.</span>
        <Link
          :href="`/compliance/profiles/${request.client_id}`"
          class="ms-auto inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
        >
          Review KYC <ExternalLink class="size-3" />
        </Link>
      </div>

      <!-- client -->
      <Link
        :href="`/clients/${request.client_id}`"
        class="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-muted-surface"
      >
        <CircleUserRound class="size-4 text-muted" /> Client #{{ request.client_id }}
        <ExternalLink class="size-3.5 text-muted" />
      </Link>

      <!-- details -->
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          v-for="d in details"
          :key="d.label"
          :label="d.label"
          :value="d.value"
          :icon="d.icon"
        />
      </div>

      <p v-if="request.decision_reason" class="mt-4 rounded-lg border border-border bg-surface-sunken p-3 text-sm text-muted">
        <span class="font-medium text-fg">Decision:</span> {{ request.decision_reason }}
      </p>

      <!-- actions -->
      <div class="mt-5 border-t border-border pt-4">
        <RequestActions
          :request="request"
          layout="bar"
          :approve-blocked="approveBlocked"
          block-reason="Client KYC must be verified before approving."
          @changed="emit('changed'); detail.refetch()"
        />
        <p v-if="request.status !== 'pending'" class="text-sm text-muted">
          This request has been {{ request.status }} — no further action.
        </p>
      </div>
    </div>

    <div v-else class="flex h-full items-center justify-center text-sm text-muted">
      Select a request to review.
    </div>
  </div>
</template>

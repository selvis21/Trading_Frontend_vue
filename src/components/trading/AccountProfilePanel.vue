<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  Copy,
  ExternalLink,
  ShieldCheck,
  CircleUserRound,
  Server,
  Layers,
  Gauge,
  CalendarClock,
} from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import AccountTypePill from './AccountTypePill.vue';
import LifecycleStepper from './LifecycleStepper.vue';
import AccountActions from './AccountActions.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { useTradingAccount } from '@/queries/trading';
import { useClientKyc } from '@/queries/compliance';
import type { TradingAccount } from '@/types/trading';

/* Center panel: the account 360°. Trading Account Profile (identity +
 * lifecycle + actions) over a Client Summary (cross-link + KYC gate) over
 * Account Details (platform/group/leverage/timestamps). MT logins and
 * servers render mono and are click-to-copy. */
const props = defineProps<{
  accountId: number;
  /** Optional row data so the header paints before the detail resolves. */
  fallback?: TradingAccount | null;
}>();
const emit = defineEmits<{ changed: [] }>();

const toast = useToast();
const auth = useAuthStore();
const detail = useTradingAccount(() => props.accountId);
const account = computed<TradingAccount | null>(
  () => detail.data.value ?? props.fallback ?? null,
);

// KYC status of the owning client (cross-domain context). Gated behind
// compliance.view by passing null when the operator can't see it — so we
// never trip the global 403 handler on an out-of-scope KYC fetch.
const kyc = useClientKyc(() =>
  auth.can('compliance.view') ? account.value?.client_id ?? null : null,
);

const platform = computed(() => {
  const p = account.value?.platform;
  return p && 'name' in p ? p : null;
});
const group = computed(() => {
  const g = account.value?.group;
  return g && 'name' in g ? g : null;
});

async function copy(value: string | null | undefined, label: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error('Copy failed');
  }
}

const details = computed(() => {
  const a = account.value;
  if (!a) return [];
  return [
    { icon: Server, label: 'Platform', value: platform.value?.name ?? `#${a.trading_platform_id}`, mono: false },
    { icon: Layers, label: 'Group', value: group.value?.name ?? (a.trading_group_id ? `#${a.trading_group_id}` : '—'), mono: false },
    { icon: Gauge, label: 'Leverage', value: `1:${a.leverage ?? '—'}`, mono: true },
    { icon: Server, label: 'Server', value: a.server ?? '—', mono: true, copy: a.server },
    { icon: CalendarClock, label: 'Opened', value: a.opened_at ? timeAgo(a.opened_at) : '—', mono: false },
    { icon: CalendarClock, label: 'Suspended', value: a.suspended_at ? timeAgo(a.suspended_at) : '—', mono: false },
    { icon: CalendarClock, label: 'Closed', value: a.closed_at ? timeAgo(a.closed_at) : '—', mono: false },
  ];
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div v-if="detail.isLoading.value && !account" class="flex h-full items-center justify-center">
      <Spinner label="Loading account…" />
    </div>

    <div v-else-if="account" class="min-h-0 flex-1 overflow-y-auto">
      <!-- Trading Account Profile -->
      <header class="border-b border-border p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <button
                class="inline-flex items-center gap-1.5 font-mono text-lg font-semibold text-fg hover:text-primary"
                dir="ltr"
                @click="copy(account.login, 'Login')"
              >
                {{ account.login ?? `Account #${account.id}` }}
                <Copy class="size-3.5 text-muted" />
              </button>
              <AccountTypePill :type="account.account_type" />
              <StatusBadge :status="account.status" />
            </div>
            <p v-if="account.name" class="mt-0.5 truncate text-sm text-muted">{{ account.name }}</p>
          </div>
          <Link
            :href="`/trading/accounts/${account.id}`"
            class="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
          >
            <ExternalLink class="size-3.5" /> Full detail
          </Link>
        </div>

        <div class="mt-4">
          <LifecycleStepper :status="account.status" />
        </div>

        <div class="mt-4">
          <AccountActions :account="account" layout="bar" @changed="emit('changed')" />
        </div>
      </header>

      <!-- Client Summary -->
      <section class="border-b border-border p-4">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Client summary</h3>
        <div class="flex flex-wrap items-center gap-3">
          <Link
            :href="`/clients/${account.client_id}`"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-muted-surface"
          >
            <CircleUserRound class="size-4 text-muted" /> Client #{{ account.client_id }}
            <ExternalLink class="size-3.5 text-muted" />
          </Link>
          <span class="inline-flex items-center gap-1.5 text-sm">
            <ShieldCheck class="size-4 text-muted" />
            <span class="text-muted">KYC</span>
            <StatusBadge v-if="kyc.data.value" :status="kyc.data.value.status" />
            <span v-else class="text-muted">—</span>
          </span>
          <Link
            :href="`/compliance/profiles/${account.client_id}`"
            class="text-xs text-muted hover:text-fg"
          >
            View KYC
          </Link>
        </div>
      </section>

      <!-- Account Details -->
      <section class="p-4">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Account details</h3>
        <dl class="grid grid-cols-2 gap-x-4 gap-y-3">
          <div v-for="d in details" :key="d.label" class="min-w-0">
            <dt class="flex items-center gap-1 text-xs text-muted">
              <component :is="d.icon" class="size-3.5" /> {{ d.label }}
            </dt>
            <dd
              :class="cn('mt-0.5 truncate text-sm text-fg', d.mono && 'font-mono tabular-nums')"
              :dir="d.mono ? 'ltr' : undefined"
            >
              <button
                v-if="d.copy"
                class="inline-flex items-center gap-1 hover:text-primary"
                @click="copy(d.copy, d.label)"
              >
                {{ d.value }} <Copy class="size-3 text-muted" />
              </button>
              <template v-else>{{ d.value }}</template>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  </div>
</template>

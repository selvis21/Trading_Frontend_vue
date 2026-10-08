<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  ExternalLink,
  CircleUserRound,
  LineChart,
  Wallet as WalletIcon,
  Snowflake,
  Receipt,
  MessageSquare,
  CalendarClock,
} from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Badge from '@/components/ui/Badge.vue';
import TransactionTypeBadge from './TransactionTypeBadge.vue';
import MoneyAmount from './MoneyAmount.vue';
import TransactionActions from './TransactionActions.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { timeAgo } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useTransaction, useWallet } from '@/queries/finance';
import { useTradingAccount } from '@/queries/trading';
import type { FinanceTransaction } from '@/types/finance';

/* Center panel: the transaction 360°. Detail + Client Summary + Trading
 * Account Summary, with the approve/reject/cancel actions. Money is integer
 * minor units via MoneyAmount. Cross-domain lookups (wallet / trading
 * account) are permission-gated by passing null so an out-of-scope fetch
 * never trips the global 403 handler. */
const props = defineProps<{
  transactionId: number;
  fallback?: FinanceTransaction | null;
}>();
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const detail = useTransaction(() => props.transactionId);
const txn = computed<FinanceTransaction | null>(
  () => detail.data.value ?? props.fallback ?? null,
);

const wallet = useWallet(() =>
  auth.can('finance.view') ? txn.value?.wallet_id ?? null : null,
);
const tradingAccount = useTradingAccount(() =>
  auth.can('trading.view') ? txn.value?.trading_account_id ?? null : null,
);

const details = computed(() => {
  const t = txn.value;
  if (!t) return [];
  const out: { icon: typeof Receipt; label: string; value: string }[] = [];
  if (t.reference) out.push({ icon: Receipt, label: 'Reference', value: t.reference });
  out.push({
    icon: CalendarClock,
    label: 'Requested',
    value: t.created_at ? timeAgo(t.created_at) : '—',
  });
  out.push({
    icon: CalendarClock,
    label: 'Reviewed',
    value: t.reviewed_at ? timeAgo(t.reviewed_at) : '—',
  });
  out.push({
    icon: CalendarClock,
    label: 'Posted',
    value: t.posted_at ? timeAgo(t.posted_at) : '—',
  });
  return out;
});
</script>

<template>
  <div class="flex h-full flex-col">
    <div v-if="detail.isLoading.value && !txn" class="flex h-full items-center justify-center">
      <Spinner label="Loading transaction…" />
    </div>

    <div v-else-if="txn" class="min-h-0 flex-1 overflow-y-auto">
      <!-- Transaction detail header -->
      <header class="border-b border-border p-4">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <TransactionTypeBadge :type="txn.type" />
              <StatusBadge :status="txn.status" />
              <span class="text-xs text-muted">#{{ txn.id }}</span>
            </div>
            <div class="mt-2">
              <MoneyAmount
                :minor="txn.amount"
                :currency-id="txn.currency_id"
                :direction="txn.type === 'withdrawal' ? 'out' : 'in'"
                colored
                strong
                class="text-2xl"
              />
              <span v-if="txn.fee_amount" class="ms-2 text-xs text-muted">
                fee <MoneyAmount :minor="txn.fee_amount" :currency-id="txn.currency_id" />
              </span>
            </div>
          </div>
          <Link
            :href="`/finance/transactions/${txn.id}`"
            class="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
          >
            <ExternalLink class="size-3.5" /> Full detail
          </Link>
        </div>

        <p v-if="txn.comment" class="mt-2 text-sm text-muted">{{ txn.comment }}</p>
        <p v-if="txn.decision_reason" class="mt-2 rounded-md border border-border bg-surface-sunken p-2 text-sm text-muted">
          <span class="font-medium text-fg">Decision:</span> {{ txn.decision_reason }}
        </p>

        <div class="mt-4">
          <TransactionActions :transaction="txn" layout="bar" @changed="emit('changed')" />
        </div>
      </header>

      <!-- detail facts -->
      <section class="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-border p-4">
        <div v-for="d in details" :key="d.label">
          <dt class="flex items-center gap-1 text-xs text-muted">
            <component :is="d.icon" class="size-3.5" /> {{ d.label }}
          </dt>
          <dd class="mt-0.5 truncate text-sm text-fg">{{ d.value }}</dd>
        </div>
      </section>

      <!-- Client summary -->
      <section class="border-b border-border p-4">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Client summary</h3>
        <div class="flex flex-wrap items-center gap-2">
          <Link
            :href="`/clients/${txn.client_id}`"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-muted-surface"
          >
            <CircleUserRound class="size-4 text-muted" /> Client #{{ txn.client_id }}
            <ExternalLink class="size-3.5 text-muted" />
          </Link>
          <Link
            v-if="txn.wallet_id"
            :href="`/finance/wallets/${txn.wallet_id}`"
            class="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-fg hover:bg-muted-surface"
          >
            <WalletIcon class="size-4 text-muted" /> Wallet #{{ txn.wallet_id }}
            <MoneyAmount
              v-if="wallet.data.value"
              :minor="wallet.data.value.balance"
              :currency-id="wallet.data.value.currency_id"
            />
            <Badge v-if="wallet.data.value?.status === 'frozen'" tone="warning">
              <Snowflake class="size-3" /> Frozen
            </Badge>
          </Link>
        </div>
      </section>

      <!-- Trading account summary -->
      <section v-if="txn.trading_account_id" class="p-4">
        <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Trading account summary</h3>
        <Link
          :href="`/trading/accounts/${txn.trading_account_id}`"
          class="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-medium text-fg hover:bg-muted-surface"
        >
          <LineChart class="size-4 text-muted" />
          <span class="font-mono" dir="ltr">
            {{ tradingAccount.data.value?.login ?? `Account #${txn.trading_account_id}` }}
          </span>
          <StatusBadge v-if="tradingAccount.data.value" :status="tradingAccount.data.value.status" />
          <ExternalLink class="size-3.5 text-muted" />
        </Link>
      </section>
    </div>

    <div v-else class="flex h-full items-center justify-center text-sm text-muted">
      Select a transaction to begin.
    </div>
  </div>
</template>

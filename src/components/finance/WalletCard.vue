<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { Snowflake, Sun, Wallet as WalletIcon, ExternalLink } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import MoneyAmount from './MoneyAmount.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import { useFreezeWallet, useUnfreezeWallet } from '@/queries/finance';
import { useMoney } from '@/composables/useMoney';
import type { Wallet } from '@/types/finance';

/* Wallet card: cash vs credit balance breakdown (always separated, never
 * conflated), status, and the freeze/unfreeze guardrail. Money is integer
 * minor units via MoneyAmount. */
const props = withDefaults(
  defineProps<{ wallet: Wallet; link?: boolean; actions?: boolean }>(),
  { link: true, actions: true },
);
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();
const { codeFor } = useMoney();

const freeze = useFreezeWallet();
const unfreeze = useUnfreezeWallet();

const isFrozen = computed(() => props.wallet.status === 'frozen');
const canManage = computed(() => auth.can('finance.wallets.manage'));
// Integer total exposure for the header (cash + credit, minor units).
const total = computed(() => props.wallet.balance + props.wallet.credit_balance);
const currencyCode = computed(() => codeFor(props.wallet.currency_id));

async function toggleFreeze() {
  if (isFrozen.value) {
    const ok = await confirm({
      title: 'Unfreeze wallet?',
      description: 'New transactions will be allowed on this wallet again.',
      confirmLabel: 'Unfreeze',
      tone: 'success',
    });
    if (!ok) return;
    unfreeze.mutate(
      { id: props.wallet.id, clientId: props.wallet.client_id },
      {
        onSuccess: () => {
          toast.success('Wallet unfrozen');
          emit('changed');
        },
        onError: (e) => toast.fromError(e),
      },
    );
  } else {
    const ok = await confirm({
      title: 'Freeze wallet?',
      description: 'This blocks all new transactions on the wallet until unfrozen.',
      confirmLabel: 'Freeze',
      tone: 'warning',
    });
    if (!ok) return;
    freeze.mutate(
      { id: props.wallet.id, clientId: props.wallet.client_id },
      {
        onSuccess: () => {
          toast.success('Wallet frozen');
          emit('changed');
        },
        onError: (e) => toast.fromError(e),
      },
    );
  }
}
</script>

<template>
  <div class="rounded-lg border border-border bg-surface p-4">
    <div class="flex items-start justify-between gap-2">
      <div class="flex items-center gap-2">
        <span class="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <WalletIcon class="size-4" />
        </span>
        <div>
          <p class="text-sm font-medium text-fg">Wallet #{{ wallet.id }}</p>
          <p class="text-xs text-muted">{{ currencyCode }}</p>
        </div>
      </div>
      <StatusBadge :status="wallet.status" />
    </div>

    <!-- balance breakdown: cash vs credit (never conflated) -->
    <div class="mt-4 grid grid-cols-2 gap-3">
      <div class="rounded-md border border-border bg-surface-sunken p-3">
        <p class="text-xs uppercase tracking-wide text-muted">Cash</p>
        <MoneyAmount :minor="wallet.balance" :currency-id="wallet.currency_id" strong class="text-lg" />
      </div>
      <div class="rounded-md border border-border bg-surface-sunken p-3">
        <p class="flex items-center gap-1 text-xs uppercase tracking-wide text-muted">
          Credit <Badge tone="accent">bonus</Badge>
        </p>
        <MoneyAmount :minor="wallet.credit_balance" :currency-id="wallet.currency_id" strong class="text-lg" />
      </div>
    </div>
    <p class="mt-2 text-xs text-muted">
      Total exposure
      <MoneyAmount :minor="total" :currency-id="wallet.currency_id" class="text-fg" />
    </p>

    <div class="mt-3 flex items-center gap-2">
      <Button
        v-if="actions && canManage"
        size="sm"
        :variant="isFrozen ? 'outline' : 'outline'"
        :loading="freeze.isPending.value || unfreeze.isPending.value"
        @click="toggleFreeze"
      >
        <component :is="isFrozen ? Sun : Snowflake" class="size-4" />
        {{ isFrozen ? 'Unfreeze' : 'Freeze' }}
      </Button>
      <Link
        v-if="link"
        :href="`/finance/wallets/${wallet.id}`"
        class="inline-flex items-center gap-1 text-xs text-muted hover:text-fg"
      >
        <ExternalLink class="size-3.5" /> Ledger
      </Link>
    </div>
  </div>
</template>

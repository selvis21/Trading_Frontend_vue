<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { ArrowRight, KeyRound } from '@lucide/vue';
import Modal from '@/components/ui/Modal.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import MoneyAmount from './MoneyAmount.vue';
import type { FinanceTransaction, Wallet } from '@/types/finance';

/* High-stakes approval confirmation (Stripe-grade): re-type the amount,
 * see the wallet balance before → after, leave an audit comment, and an
 * idempotency reference is shown. Confirm is disabled until the typed
 * amount matches and stays disabled while the mutation is in flight
 * (double-submit protection). All balance maths is integer minor units. */
const props = defineProps<{
  open: boolean;
  transaction: FinanceTransaction;
  /** Source wallet, for the before/after preview (optional). */
  wallet?: Wallet | null;
  title?: string;
  confirmLabel?: string;
  loading?: boolean;
}>();
const emit = defineEmits<{
  'update:open': [v: boolean];
  confirm: [{ comment: string }];
}>();

const typed = ref('');
const comment = ref('');
watch(
  () => props.open,
  (o) => {
    if (o) {
      typed.value = '';
      comment.value = '';
    }
  },
);

// Expected re-entry is the transaction's own decimal string (no float maths).
const expected = computed(() => props.transaction.amount_decimal);
const normalized = computed(() => typed.value.replace(/[,\s]/g, ''));
const matches = computed(() => normalized.value === expected.value);

// Integer-only before/after. Deposit credits the wallet; withdrawal debits.
const isDeposit = computed(() => props.transaction.type === 'deposit');
const before = computed(() => props.wallet?.balance ?? null);
const after = computed(() => {
  if (before.value === null) return null;
  return isDeposit.value
    ? before.value + props.transaction.amount
    : before.value - props.transaction.amount;
});
const wouldGoNegative = computed(() => after.value !== null && after.value < 0);

const idempotencyRef = computed(
  () => props.transaction.reference ?? `TXN-${props.transaction.id}`,
);
</script>

<template>
  <Modal
    :open="open"
    :title="title ?? 'Confirm approval'"
    size="md"
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <!-- amount -->
      <div class="flex items-center justify-between rounded-lg border border-border bg-surface-sunken px-4 py-3">
        <span class="text-sm text-muted">Amount</span>
        <MoneyAmount
          :minor="transaction.amount"
          :currency-id="transaction.currency_id"
          strong
          class="text-lg"
        />
      </div>

      <!-- before → after -->
      <div
        v-if="before !== null"
        class="flex items-center justify-center gap-3 rounded-lg border border-border bg-surface py-3 text-sm"
      >
        <span class="text-center">
          <span class="block text-xs uppercase tracking-wide text-muted">Balance</span>
          <MoneyAmount :minor="before" :currency-id="transaction.currency_id" />
        </span>
        <ArrowRight class="size-4 text-muted" />
        <span class="text-center">
          <span class="block text-xs uppercase tracking-wide text-muted">After</span>
          <MoneyAmount
            :minor="after"
            :currency-id="transaction.currency_id"
            :class="wouldGoNegative ? 'text-status-danger' : 'text-fg'"
          />
        </span>
      </div>
      <p v-if="wouldGoNegative" class="-mt-2 text-xs text-status-danger">
        This would overdraw the wallet — the server will reject a negative balance.
      </p>

      <!-- re-type amount -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          Re-type amount <span class="text-muted">({{ expected }})</span>
        </label>
        <Input v-model="typed" :placeholder="expected" inputmode="decimal" />
      </div>

      <!-- audit comment -->
      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Audit comment <span class="text-muted">(optional)</span></label>
        <textarea
          v-model="comment"
          rows="2"
          maxlength="1000"
          placeholder="Context for the ledger / audit trail…"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <!-- idempotency -->
      <p class="flex items-center gap-1.5 text-xs text-muted">
        <KeyRound class="size-3.5" /> Idempotency reference:
        <span class="font-mono text-fg" dir="ltr">{{ idempotencyRef }}</span>
      </p>
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button
        size="sm"
        :disabled="!matches"
        :loading="loading"
        @click="matches && emit('confirm', { comment: comment.trim() })"
      >
        {{ confirmLabel ?? 'Confirm' }}
      </Button>
    </div>
  </Modal>
</template>

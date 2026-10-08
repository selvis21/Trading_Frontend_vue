<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ArrowRight, KeyRound } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import MoneyAmount from './MoneyAmount.vue';
import ClientField from './ClientField.vue';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/sales';
import { useToast } from '@/composables/useToast';
import { useClientWallets, useCreateTransfer } from '@/queries/finance';
import { useMoney } from '@/composables/useMoney';

/* Transfer review/create between two of a client's wallets. Executes
 * immediately on the server (posts a transfer_out + transfer_in pair).
 * Wallets must share a currency (guarded here; server enforces too). The
 * amount is a decimal string sent verbatim — no float maths. An
 * idempotency key is generated and shown for double-submit protection. */
const props = defineProps<{ open: boolean; clientId?: number | null }>();
const emit = defineEmits<{ 'update:open': [v: boolean]; done: [] }>();

const toast = useToast();
const transfer = useCreateTransfer();
const { codeFor } = useMoney();

// Client-first: pick a client via search (or locked when launched from a
// client context); the numeric id is derived internally.
const selectedClient = ref<Client | null>(null);
const clientId = computed(() => props.clientId ?? selectedClient.value?.id ?? null);
const wallets = useClientWallets(clientId);

const fromId = ref<number | null>(null);
const toId = ref<number | null>(null);
const amount = ref('');
const comment = ref('');
const idempotencyKey = ref('');

function freshKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Deterministic-enough fallback that varies per open without Math.random.
    return `tr-${Date.now().toString(36)}`;
  }
}

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    selectedClient.value = null;
    fromId.value = null;
    toId.value = null;
    amount.value = '';
    comment.value = '';
    idempotencyKey.value = freshKey();
  },
);

const list = computed(() => wallets.data.value ?? []);
const fromWallet = computed(() => list.value.find((w) => w.id === fromId.value) ?? null);
const toWallet = computed(() => list.value.find((w) => w.id === toId.value) ?? null);

const sameCurrency = computed(
  () =>
    !fromWallet.value ||
    !toWallet.value ||
    fromWallet.value.currency_id === toWallet.value.currency_id,
);
// Pure regex — money strings are never parsed into a float for validation.
const amountValid = computed(
  () => /^\d+(\.\d{1,8})?$/.test(amount.value) && /[1-9]/.test(amount.value),
);
const valid = computed(
  () =>
    !!fromId.value &&
    !!toId.value &&
    fromId.value !== toId.value &&
    sameCurrency.value &&
    amountValid.value,
);

watch([fromId, toId], () => {
  if (fromId.value && fromId.value === toId.value) toId.value = null;
});

function submit() {
  if (!valid.value || !fromId.value || !toId.value) return;
  transfer.mutate(
    {
      from_wallet_id: fromId.value,
      to_wallet_id: toId.value,
      amount: amount.value,
      idempotency_key: idempotencyKey.value,
      comment: comment.value.trim() || undefined,
    },
    {
      onSuccess: () => {
        toast.success('Transfer posted');
        emit('done');
        emit('update:open', false);
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

const field =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="34rem"
    title="Transfer review"
    description="Move funds between two of a client's wallets."
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <ClientField v-model="selectedClient" :locked-client-id="props.clientId ?? null" />

      <div v-if="clientId" class="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">From</label>
          <select v-model.number="fromId" :class="field">
            <option :value="null" disabled>Select wallet</option>
            <option v-for="w in list" :key="w.id" :value="w.id">
              #{{ w.id }} · {{ codeFor(w.currency_id) }}
            </option>
          </select>
        </div>
        <ArrowRight class="mb-2.5 size-4 text-muted" />
        <div class="space-y-1.5">
          <label class="text-sm font-medium text-fg">To</label>
          <select v-model.number="toId" :class="field">
            <option :value="null" disabled>Select wallet</option>
            <option v-for="w in list" :key="w.id" :value="w.id" :disabled="w.id === fromId">
              #{{ w.id }} · {{ codeFor(w.currency_id) }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="fromWallet" class="rounded-md border border-border bg-surface-sunken p-3 text-sm">
        Source available
        <MoneyAmount :minor="fromWallet.balance" :currency-id="fromWallet.currency_id" class="ms-1 font-medium text-fg" />
      </div>

      <p v-if="!sameCurrency" class="text-xs text-status-danger">
        Wallets must share the same currency to transfer.
      </p>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">
          Amount<span v-if="fromWallet"> ({{ codeFor(fromWallet.currency_id) }})</span>
        </label>
        <Input v-model="amount" inputmode="decimal" placeholder="0.00" />
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Comment <span class="text-muted">(optional)</span></label>
        <textarea
          v-model="comment"
          rows="2"
          maxlength="1000"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <p class="flex items-center gap-1.5 text-xs text-muted">
        <KeyRound class="size-3.5" /> Idempotency:
        <span class="font-mono text-fg" dir="ltr">{{ idempotencyKey.slice(0, 18) }}…</span>
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
        <Button size="sm" :disabled="!valid" :loading="transfer.isPending.value" @click="submit">
          Post transfer
        </Button>
      </div>
    </template>
  </Sheet>
</template>

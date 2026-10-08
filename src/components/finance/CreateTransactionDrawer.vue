<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { KeyRound } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import ClientField from './ClientField.vue';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/sales';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import {
  useCreateDeposit,
  useCreateWithdrawal,
  usePaymentMethods,
} from '@/queries/finance';

/* Create a deposit or withdrawal for a client. Posts a pending request by
 * default; "post directly" (when permitted) settles immediately. The amount
 * is a decimal string sent verbatim to the server — no float maths. An
 * idempotency key guards against double submission. */
const props = defineProps<{
  open: boolean;
  clientId?: number | null;
  /** Lock the kind when launched from a deposits/withdrawals view. */
  kind?: 'deposit' | 'withdrawal';
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; created: [] }>();

const auth = useAuthStore();
const toast = useToast();
const methods = usePaymentMethods(true);
const createDeposit = useCreateDeposit();
const createWithdrawal = useCreateWithdrawal();

// Client-first: the operator picks a client (searchable) instead of typing a
// raw numeric id; the id is derived and sent to the API.
const selectedClient = ref<Client | null>(null);
const clientId = computed(() => props.clientId ?? selectedClient.value?.id ?? null);
const kind = ref<'deposit' | 'withdrawal'>(props.kind ?? 'deposit');
const amount = ref('');
const methodId = ref<number | null>(null);
const reference = ref('');
const comment = ref('');
const direct = ref(false);
const idempotencyKey = ref('');

function freshKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `tx-${Date.now().toString(36)}`;
  }
}

watch(
  () => props.open,
  (o) => {
    if (!o) return;
    selectedClient.value = null;
    kind.value = props.kind ?? 'deposit';
    amount.value = '';
    methodId.value = null;
    reference.value = '';
    comment.value = '';
    direct.value = false;
    idempotencyKey.value = freshKey();
  },
);

const canDirect = computed(() =>
  kind.value === 'deposit'
    ? auth.can('finance.deposits.approve')
    : auth.can('finance.withdrawals.approve'),
);
// Pure regex — money strings are never parsed into a float for validation.
const amountValid = computed(
  () => /^\d+(\.\d{1,8})?$/.test(amount.value) && /[1-9]/.test(amount.value),
);
const valid = computed(() => !!clientId.value && clientId.value > 0 && amountValid.value);

function submit() {
  if (!valid.value || !clientId.value) return;
  const payload = {
    amount: amount.value,
    payment_method_id: methodId.value,
    reference: reference.value.trim() || undefined,
    comment: comment.value.trim() || undefined,
    idempotency_key: idempotencyKey.value,
    direct: direct.value && canDirect.value ? true : undefined,
  };
  const mutation = kind.value === 'deposit' ? createDeposit : createWithdrawal;
  mutation.mutate(
    { clientId: clientId.value, payload },
    {
      onSuccess: () => {
        toast.success(
          `${kind.value === 'deposit' ? 'Deposit' : 'Withdrawal'} ${direct.value && canDirect.value ? 'posted' : 'requested'}`,
        );
        emit('created');
        emit('update:open', false);
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

const pending = computed(
  () => createDeposit.isPending.value || createWithdrawal.isPending.value,
);
const field =
  'w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="32rem"
    title="New transaction"
    description="Create a deposit or withdrawal for a client."
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-5">
      <!-- kind -->
      <div v-if="!props.kind" class="space-y-1.5">
        <span class="text-sm font-medium text-fg">Type</span>
        <div class="flex gap-2">
          <button
            v-for="k in (['deposit', 'withdrawal'] as const)"
            :key="k"
            type="button"
            :class="
              cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors',
                kind === k ? 'border-primary bg-primary/5 text-fg' : 'border-border text-muted hover:bg-muted-surface',
              )
            "
            @click="kind = k"
          >
            {{ k }}
          </button>
        </div>
      </div>

      <ClientField v-model="selectedClient" :locked-client-id="props.clientId ?? null" />

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Amount</label>
        <Input v-model="amount" inputmode="decimal" placeholder="0.00" />
        <p v-if="amount && !amountValid" class="text-xs text-status-danger">
          Enter a positive amount.
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Payment method <span class="text-muted">(optional)</span></label>
        <select v-model.number="methodId" :class="field">
          <option :value="null">—</option>
          <option v-for="m in methods.data.value ?? []" :key="m.id" :value="m.id">{{ m.name }}</option>
        </select>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Reference <span class="text-muted">(optional)</span></label>
        <Input v-model="reference" placeholder="External reference" />
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

      <label v-if="canDirect" class="flex items-center gap-2 text-sm text-fg">
        <input v-model="direct" type="checkbox" class="size-4 rounded border-input accent-primary" />
        Post directly (skip the pending queue)
      </label>

      <p class="flex items-center gap-1.5 text-xs text-muted">
        <KeyRound class="size-3.5" /> Idempotency:
        <span class="font-mono text-fg" dir="ltr">{{ idempotencyKey.slice(0, 18) }}…</span>
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
        <Button size="sm" :disabled="!valid" :loading="pending" @click="submit">
          {{ direct && canDirect ? 'Post' : 'Submit request' }}
        </Button>
      </div>
    </template>
  </Sheet>
</template>

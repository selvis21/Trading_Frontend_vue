<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { Gift } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import Input from '@/components/ui/Input.vue';
import ClientField from './ClientField.vue';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/sales';
import { useToast } from '@/composables/useToast';
import { useCreditAdjustment } from '@/queries/finance';
import { useMoney } from '@/composables/useMoney';

/* Credit adjustment to a client's wallet CREDIT balance (bonus), separate
 * from cash. The amount is entered as a decimal string and sent verbatim to
 * the server, which converts to integer minor units — the UI performs no
 * floating-point money maths. Direction selects credit (grant) vs debit
 * (claw back).
 *
 * Client-first: when launched from a client context (`clientId`) the client
 * is locked and shown read-only; otherwise the operator searches by name,
 * email, mobile or client code (or creates the client) — the numeric id is
 * carried internally and never typed. Uses a Sheet (not a transform-centred
 * Modal) so the inline (non-portalled) picker positions correctly inside the
 * dialog's focus scope. */
const props = defineProps<{
  open: boolean;
  clientId?: number | null;
  currencyId?: number | null;
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; done: [] }>();

const toast = useToast();
const credit = useCreditAdjustment();
const { codeFor } = useMoney();

const selectedClient = ref<Client | null>(null);
const effectiveClientId = computed(
  () => props.clientId ?? selectedClient.value?.id ?? null,
);

const amount = ref('');
const direction = ref<'credit' | 'debit'>('credit');
const comment = ref('');

watch(
  () => props.open,
  (o) => {
    if (o) {
      selectedClient.value = null;
      amount.value = '';
      direction.value = 'credit';
      comment.value = '';
    }
  },
);

// Format-only validation (pure regex) — the money string is never parsed
// into a float. Requires well-formed decimal with at least one non-zero digit.
const amountValid = computed(
  () => /^\d+(\.\d{1,8})?$/.test(amount.value) && /[1-9]/.test(amount.value),
);
const valid = computed(() => !!effectiveClientId.value && amountValid.value);
const currencyCode = computed(() => codeFor(props.currencyId));

function submit() {
  const clientId = effectiveClientId.value;
  if (!valid.value || !clientId) return;
  credit.mutate(
    {
      clientId,
      payload: {
        amount: amount.value,
        direction: direction.value,
        currency_id: props.currencyId,
        comment: comment.value.trim() || undefined,
      },
    },
    {
      onSuccess: () => {
        toast.success(direction.value === 'credit' ? 'Credit granted' : 'Credit adjusted');
        emit('done');
        emit('update:open', false);
      },
      onError: (e) => toast.fromError(e),
    },
  );
}
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="32rem"
    title="Credit adjustment"
    description="Posts to the wallet's credit (bonus) balance — separate from cash."
    @update:open="emit('update:open', $event)"
  >
    <div class="space-y-4">
      <ClientField v-model="selectedClient" :locked-client-id="props.clientId ?? null" />

      <div class="space-y-1.5">
        <span class="text-sm font-medium text-fg">Direction</span>
        <div class="flex gap-2">
          <button
            v-for="d in (['credit', 'debit'] as const)"
            :key="d"
            type="button"
            :class="
              cn(
                'flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors',
                direction === d ? 'border-primary bg-primary/5 text-fg' : 'border-border text-muted hover:bg-muted-surface',
              )
            "
            @click="direction = d"
          >
            {{ d === 'credit' ? 'Grant credit' : 'Remove credit' }}
          </button>
        </div>
      </div>

      <div class="space-y-1.5">
        <label class="flex items-center gap-1.5 text-sm font-medium text-fg">
          <Gift class="size-4 text-muted" /> Amount ({{ currencyCode }})
        </label>
        <Input v-model="amount" inputmode="decimal" placeholder="0.00" />
        <p v-if="amount && !amountValid" class="text-xs text-status-danger">
          Enter a positive amount (up to 8 decimal places).
        </p>
      </div>

      <div class="space-y-1.5">
        <label class="text-sm font-medium text-fg">Comment <span class="text-muted">(optional)</span></label>
        <textarea
          v-model="comment"
          rows="2"
          maxlength="1000"
          placeholder="Reason for the adjustment…"
          class="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm text-fg placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
        <Button size="sm" :disabled="!valid" :loading="credit.isPending.value" @click="submit">
          Post adjustment
        </Button>
      </div>
    </template>
  </Sheet>
</template>

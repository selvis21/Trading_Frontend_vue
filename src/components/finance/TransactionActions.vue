<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check, X, Ban } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import AmountConfirmDialog from './AmountConfirmDialog.vue';
import ReasonDialog from './ReasonDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import {
  useApproveDeposit,
  useApproveWithdrawal,
  useRejectTransaction,
  useCancelTransaction,
  useAddFinanceNote,
  useWallet,
} from '@/queries/finance';
import type { FinanceTransaction } from '@/types/finance';

/* Lifecycle actions for a transaction. Approve (deposit/withdrawal) opens
 * the amount-reentry confirmation; reject requires a reason; cancel takes
 * an optional reason. Only pending transactions offer decisions, and only
 * the matching approve permission is shown. The audit comment, when
 * provided, is recorded as a transaction-linked finance note. */
const props = withDefaults(
  defineProps<{ transaction: FinanceTransaction; layout?: 'inline' | 'bar' }>(),
  { layout: 'bar' },
);
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const toast = useToast();

const approveDeposit = useApproveDeposit();
const approveWithdrawal = useApproveWithdrawal();
const reject = useRejectTransaction();
const cancel = useCancelTransaction();
const addNote = useAddFinanceNote();

const t = computed(() => props.transaction);
const isPending = computed(() => t.value.status === 'pending');
const isDeposit = computed(() => t.value.type === 'deposit');
const isWithdrawal = computed(() => t.value.type === 'withdrawal');

const canApprove = computed(
  () =>
    isPending.value &&
    ((isDeposit.value && auth.can('finance.deposits.approve')) ||
      (isWithdrawal.value && auth.can('finance.withdrawals.approve'))),
);
const canReview = computed(
  () => isPending.value && auth.can('finance.transactions.review'),
);
const hasAny = computed(() => canApprove.value || canReview.value);

// Wallet for the before/after preview (only fetched when an approval is possible).
const walletId = computed(() => (canApprove.value ? t.value.wallet_id : null));
const walletQuery = useWallet(walletId);

const approveOpen = ref(false);
const rejectOpen = ref(false);
const cancelOpen = ref(false);
const approving = computed(
  () => approveDeposit.isPending.value || approveWithdrawal.isPending.value,
);

function recordComment(comment: string) {
  if (!comment || !auth.can('finance.notes.manage')) return;
  addNote.mutate({ clientId: t.value.client_id, body: comment, transactionId: t.value.id });
}

function onApprove({ comment }: { comment: string }) {
  const mutation = isDeposit.value ? approveDeposit : approveWithdrawal;
  mutation.mutate(
    { id: t.value.id, clientId: t.value.client_id },
    {
      onSuccess: () => {
        approveOpen.value = false;
        recordComment(comment);
        toast.success(isDeposit.value ? 'Deposit approved' : 'Withdrawal approved');
        emit('changed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

function onReject(reason: string) {
  reject.mutate(
    { id: t.value.id, reason, clientId: t.value.client_id },
    {
      onSuccess: () => {
        rejectOpen.value = false;
        toast.success('Transaction rejected');
        emit('changed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

function onCancel(reason: string) {
  cancel.mutate(
    { id: t.value.id, reason: reason || undefined, clientId: t.value.client_id },
    {
      onSuccess: () => {
        cancelOpen.value = false;
        toast.success('Transaction cancelled');
        emit('changed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}
</script>

<template>
  <div v-if="hasAny" :class="layout === 'inline' ? 'flex items-center gap-1' : 'flex flex-wrap items-center gap-2'">
    <Button
      v-if="canApprove"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="success"
      :aria-label="layout === 'inline' ? 'Approve' : undefined"
      @click="approveOpen = true"
    >
      <Check class="size-4" /><span v-if="layout === 'bar'">Approve {{ isDeposit ? 'deposit' : 'withdrawal' }}</span>
    </Button>
    <Button
      v-if="canReview"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="danger"
      :aria-label="layout === 'inline' ? 'Reject' : undefined"
      @click="rejectOpen = true"
    >
      <X class="size-4" /><span v-if="layout === 'bar'">Reject</span>
    </Button>
    <Button
      v-if="canReview"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="ghost"
      :aria-label="layout === 'inline' ? 'Cancel' : undefined"
      @click="cancelOpen = true"
    >
      <Ban class="size-4" /><span v-if="layout === 'bar'">Cancel</span>
    </Button>
  </div>

  <AmountConfirmDialog
    v-if="canApprove"
    :open="approveOpen"
    :transaction="transaction"
    :wallet="walletQuery.data.value"
    :title="isDeposit ? 'Confirm deposit' : 'Confirm withdrawal'"
    :confirm-label="isDeposit ? 'Confirm deposit' : 'Confirm withdrawal'"
    :loading="approving"
    @update:open="approveOpen = $event"
    @confirm="onApprove"
  />
  <ReasonDialog
    :open="rejectOpen"
    title="Reject transaction"
    description="The requester is notified and the reason is recorded in history."
    confirm-label="Reject"
    tone="danger"
    reason-required
    :loading="reject.isPending.value"
    @update:open="rejectOpen = $event"
    @confirm="onReject"
  />
  <ReasonDialog
    :open="cancelOpen"
    title="Cancel transaction"
    description="Withdraw this pending transaction. An optional reason is recorded."
    confirm-label="Cancel transaction"
    tone="warning"
    :loading="cancel.isPending.value"
    @update:open="cancelOpen = $event"
    @confirm="onCancel"
  />
</template>

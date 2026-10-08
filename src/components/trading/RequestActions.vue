<script setup lang="ts">
import { ref, computed } from 'vue';
import { Check, X, Ban } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import ReasonDialog from './ReasonDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  useApproveRequest,
  useRejectRequest,
  useCancelRequest,
} from '@/queries/trading';
import type { TradingAccountRequest } from '@/types/trading';

/* Decision actions for an open-account request. Approve provisions the
 * account (double-confirmed); reject requires a reason; cancel withdraws a
 * still-pending request. Only pending requests offer decisions. Gated by
 * trading.requests.approve / trading.requests.create; server enforces. */
const props = withDefaults(
  defineProps<{
    request: TradingAccountRequest;
    /** Block approval (e.g. KYC not verified) with a tooltip-style hint. */
    approveBlocked?: boolean;
    blockReason?: string;
    layout?: 'inline' | 'bar';
  }>(),
  { layout: 'bar' },
);
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();

const approve = useApproveRequest();
const reject = useRejectRequest();
const cancel = useCancelRequest();

const isPending = computed(() => props.request.status === 'pending');
const canDecide = computed(() => auth.can('trading.requests.approve'));
const canCancel = computed(() => auth.can('trading.requests.create'));

const rejectOpen = ref(false);

async function onApprove() {
  const ok = await confirm({
    title: 'Approve request?',
    description: `This provisions a live trading account for client #${props.request.client_id} on the platform. This cannot be undone.`,
    confirmLabel: 'Approve & create account',
    tone: 'success',
  });
  if (!ok) return;
  approve.mutate(
    { id: props.request.id },
    {
      onSuccess: () => {
        toast.success('Request approved — account created');
        emit('changed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

function onReject(reason: string) {
  reject.mutate(
    { id: props.request.id, reason },
    {
      onSuccess: () => {
        rejectOpen.value = false;
        toast.success('Request rejected');
        emit('changed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

async function onCancel() {
  const ok = await confirm({
    title: 'Cancel request?',
    description: 'The pending request will be withdrawn.',
    confirmLabel: 'Cancel request',
    tone: 'danger',
  });
  if (!ok) return;
  cancel.mutate(
    { id: props.request.id },
    {
      onSuccess: () => {
        toast.success('Request cancelled');
        emit('changed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}
</script>

<template>
  <div v-if="isPending && (canDecide || canCancel)" class="space-y-2">
    <div :class="layout === 'inline' ? 'flex items-center gap-1' : 'flex flex-wrap items-center gap-2'">
      <Button
        v-if="canDecide"
        :size="layout === 'inline' ? 'icon-sm' : 'sm'"
        variant="success"
        :disabled="approveBlocked"
        :loading="approve.isPending.value"
        :aria-label="layout === 'inline' ? 'Approve' : undefined"
        :title="approveBlocked ? blockReason : undefined"
        @click="onApprove"
      >
        <Check class="size-4" /><span v-if="layout === 'bar'">Approve</span>
      </Button>
      <Button
        v-if="canDecide"
        :size="layout === 'inline' ? 'icon-sm' : 'sm'"
        variant="danger"
        :aria-label="layout === 'inline' ? 'Reject' : undefined"
        @click="rejectOpen = true"
      >
        <X class="size-4" /><span v-if="layout === 'bar'">Reject</span>
      </Button>
      <Button
        v-if="canCancel"
        :size="layout === 'inline' ? 'icon-sm' : 'sm'"
        variant="ghost"
        :aria-label="layout === 'inline' ? 'Cancel' : undefined"
        @click="onCancel"
      >
        <Ban class="size-4" /><span v-if="layout === 'bar'">Cancel</span>
      </Button>
    </div>
    <p v-if="approveBlocked && blockReason && layout === 'bar'" class="text-xs text-status-warning">
      {{ blockReason }}
    </p>
  </div>

  <ReasonDialog
    :open="rejectOpen"
    title="Reject request"
    description="The client is notified the request was declined. A reason is required and recorded."
    confirm-label="Reject request"
    tone="danger"
    reason-required
    :loading="reject.isPending.value"
    @update:open="rejectOpen = $event"
    @confirm="onReject"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { PauseCircle, PlayCircle, XCircle, Gauge } from '@lucide/vue';
import Button from '@/components/ui/Button.vue';
import ReasonDialog from './ReasonDialog.vue';
import LeverageDialog from './LeverageDialog.vue';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import {
  useSuspendAccount,
  useResumeAccount,
  useCloseAccount,
  useChangeLeverage,
} from '@/queries/trading';
import type { TradingAccount } from '@/types/trading';

/* The single home for account lifecycle actions. Available transitions
 * render as the only enabled actions (a closed account offers nothing).
 * Suspend/close capture an audit reason; close is double-confirmed
 * (terminal); leverage validates against 1–5000. Optimistic — the
 * mutation primes the detail cache and invalidates lists on success. */
const props = withDefaults(
  defineProps<{
    account: TradingAccount;
    /** `inline` = compact icon row (drawer header); `bar` = labelled buttons. */
    layout?: 'inline' | 'bar';
  }>(),
  { layout: 'bar' },
);
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();

const suspend = useSuspendAccount();
const resume = useResumeAccount();
const close = useCloseAccount();
const leverage = useChangeLeverage();

const status = computed(() => props.account.status);
const canSuspend = computed(() => auth.can('trading.accounts.suspend'));
const canClose = computed(() => auth.can('trading.accounts.close'));
const canLeverage = computed(() => auth.can('trading.leverage.manage'));

const showSuspend = computed(() => canSuspend.value && status.value === 'active');
const showResume = computed(() => canSuspend.value && status.value === 'suspended');
const showClose = computed(
  () => canClose.value && ['active', 'suspended', 'pending'].includes(status.value ?? ''),
);
const showLeverage = computed(
  () => canLeverage.value && ['active', 'suspended'].includes(status.value ?? ''),
);
const hasAny = computed(
  () => showSuspend.value || showResume.value || showClose.value || showLeverage.value,
);

const suspendOpen = ref(false);
const closeOpen = ref(false);
const leverageOpen = ref(false);

function done(message: string) {
  toast.success(message);
  emit('changed');
}

function onSuspend(reason: string) {
  suspend.mutate(
    { id: props.account.id, reason: reason || undefined },
    {
      onSuccess: () => {
        suspendOpen.value = false;
        done('Account suspended');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

async function onResume() {
  const ok = await confirm({
    title: 'Resume account?',
    description: `Account ${props.account.login ?? `#${props.account.id}`} will return to active and trade on the platform again.`,
    confirmLabel: 'Resume',
    tone: 'success',
  });
  if (!ok) return;
  resume.mutate(
    { id: props.account.id },
    {
      onSuccess: () => done('Account resumed'),
      onError: (e) => toast.fromError(e),
    },
  );
}

function onClose(reason: string) {
  close.mutate(
    { id: props.account.id, reason: reason || undefined },
    {
      onSuccess: () => {
        closeOpen.value = false;
        done('Account closed');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

function onLeverage(value: number) {
  leverage.mutate(
    { id: props.account.id, leverage: value },
    {
      onSuccess: () => {
        leverageOpen.value = false;
        done('Leverage updated');
      },
      onError: (e) => toast.fromError(e),
    },
  );
}

const groupDefault = computed(() => {
  const g = props.account.group;
  return g && 'default_leverage' in g ? (g.default_leverage ?? null) : null;
});
</script>

<template>
  <div v-if="hasAny" :class="layout === 'inline' ? 'flex items-center gap-1' : 'flex flex-wrap items-center gap-2'">
    <Button
      v-if="showLeverage"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="outline"
      :aria-label="layout === 'inline' ? 'Change leverage' : undefined"
      @click="leverageOpen = true"
    >
      <Gauge class="size-4" /><span v-if="layout === 'bar'">Leverage</span>
    </Button>
    <Button
      v-if="showSuspend"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="warning"
      :aria-label="layout === 'inline' ? 'Suspend' : undefined"
      @click="suspendOpen = true"
    >
      <PauseCircle class="size-4" /><span v-if="layout === 'bar'">Suspend</span>
    </Button>
    <Button
      v-if="showResume"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="success"
      :loading="resume.isPending.value"
      :aria-label="layout === 'inline' ? 'Resume' : undefined"
      @click="onResume"
    >
      <PlayCircle class="size-4" /><span v-if="layout === 'bar'">Resume</span>
    </Button>
    <Button
      v-if="showClose"
      :size="layout === 'inline' ? 'icon-sm' : 'sm'"
      variant="danger"
      :aria-label="layout === 'inline' ? 'Close account' : undefined"
      @click="closeOpen = true"
    >
      <XCircle class="size-4" /><span v-if="layout === 'bar'">Close</span>
    </Button>
  </div>

  <ReasonDialog
    :open="suspendOpen"
    title="Suspend account"
    description="The account is frozen on the platform until resumed. The reason is recorded on the timeline."
    confirm-label="Suspend account"
    tone="warning"
    :loading="suspend.isPending.value"
    @update:open="suspendOpen = $event"
    @confirm="onSuspend"
  />
  <ReasonDialog
    :open="closeOpen"
    title="Close account"
    description="This is terminal — a closed account cannot be reopened. The reason is recorded on the timeline."
    confirm-label="Close account"
    tone="danger"
    :loading="close.isPending.value"
    @update:open="closeOpen = $event"
    @confirm="onClose"
  />
  <LeverageDialog
    :open="leverageOpen"
    :current="account.leverage"
    :group-default="groupDefault"
    :loading="leverage.isPending.value"
    @update:open="leverageOpen = $event"
    @confirm="onLeverage"
  />
</template>

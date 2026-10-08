<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  ShieldCheck,
  Upload,
  Send,
  RotateCcw,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Gift,
  ArrowLeftRight,
  Layers,
} from '@lucide/vue';
import Modal from '@/components/ui/Modal.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import DocumentsPanel from '@/components/compliance/DocumentsPanel.vue';
import DirectAccountDrawer from '@/components/trading/DirectAccountDrawer.vue';
import NewAccountDrawer from '@/components/trading/NewAccountDrawer.vue';
import CreateTransactionDrawer from '@/components/finance/CreateTransactionDrawer.vue';
import CreditDialog from '@/components/finance/CreditDialog.vue';
import TransferDrawer from '@/components/finance/TransferDrawer.vue';
import { cn } from '@/lib/utils';
import { isApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import {
  useClientKyc,
  useApplicationTransition,
  useResubmitApplication,
} from '@/queries/compliance';

/* Lightweight "act on behalf of the client" panel for the client profile.
 * Every action reuses an existing API + permission + drawer/dialog — no new
 * business rules. Buttons render only when the staff member holds the
 * permission, and disable (with a reason) when the client's state doesn't
 * allow the step. The KYC state is read from the client's KYC profile. */
const props = defineProps<{
  /** The client id (NOT the lead id) — keys every on-behalf endpoint. */
  clientId: number;
  /** Client wallet currency, passed to the credit dialog. */
  currencyId?: number | null;
}>();

const auth = useAuthStore();
const toast = useToast();

// Only query KYC when the user may see it (avoids a 403 for finance-only staff).
const kycClientId = computed(() =>
  auth.can('compliance.view') ? props.clientId : null,
);
const kyc = useClientKyc(kycClientId);
const transition = useApplicationTransition();
const resubmit = useResubmitApplication();

const applications = computed(() => kyc.data.value?.applications ?? []);
const latestApp = computed(() => {
  const list = applications.value;
  if (!list.length) return null;
  return [...list].sort((a, b) => (b.attempt ?? 0) - (a.attempt ?? 0))[0];
});
const draftApp = computed(
  () => applications.value.find((a) => a.status === 'draft') ?? null,
);
const latestRejected = computed(() => latestApp.value?.status === 'rejected');

/* ------------------------------- KYC actions -------------------------------
 * There is deliberately no visible "Start KYC" step: uploading a document
 * auto-creates the KYC profile + draft application server-side, so the manual
 * start was an unnecessary gate. The workflow stays valid — a draft is only
 * created when a document actually arrives, and submit still requires docs. */
function submitKyc() {
  const app = draftApp.value;
  if (!app) return;
  transition.mutate(
    { id: app.id, action: 'submit', clientId: props.clientId },
    {
      onSuccess: () => toast.success('KYC submitted for review'),
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
function resubmitKyc() {
  resubmit.mutate(
    { clientId: props.clientId },
    {
      onSuccess: () => toast.success('KYC re-submission started'),
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}

/* --------------------------- drawer / dialog state --------------------------- */
const docsOpen = ref(false);
const directAccountOpen = ref(false);
const requestAccountOpen = ref(false);
const txnOpen = ref(false);
const txnKind = ref<'deposit' | 'withdrawal'>('deposit');
const creditOpen = ref(false);
const transferOpen = ref(false);

const canDirectCreate = computed(() => auth.can('trading.accounts.create'));
const canRequestAccount = computed(() => auth.can('trading.requests.create'));
const canCreateAccount = computed(
  () => canDirectCreate.value || canRequestAccount.value,
);

function openAccount() {
  if (canDirectCreate.value) directAccountOpen.value = true;
  else if (canRequestAccount.value) requestAccountOpen.value = true;
}
function openTxn(kind: 'deposit' | 'withdrawal') {
  txnKind.value = kind;
  txnOpen.value = true;
}

/* ------------------------------- action tiles -------------------------------
 * Actions are grouped into the client lifecycle's process sections (KYC /
 * Trading / Finance) so the panel reads as a sequence of workflows rather
 * than a flat jumble. Each tile is still an existing API + permission. */
type ActionGroup = 'kyc' | 'trading' | 'finance';

const actions = computed(() =>
  [
    {
      key: 'upload',
      group: 'kyc' as ActionGroup,
      label: 'Upload Documents',
      icon: Upload,
      show: auth.can('compliance.upload'),
      disabled: false,
      reason: '',
      loading: false,
      onClick: () => (docsOpen.value = true),
    },
    {
      key: 'submit',
      group: 'kyc' as ActionGroup,
      label: 'Submit KYC',
      icon: Send,
      show: auth.can('compliance.submit'),
      disabled: !draftApp.value,
      reason: 'No draft application to submit',
      loading: transition.isPending.value,
      onClick: submitKyc,
    },
    {
      key: 'resubmit',
      group: 'kyc' as ActionGroup,
      label: 'Resubmit KYC',
      icon: RotateCcw,
      show: auth.can('compliance.upload'),
      disabled: !latestRejected.value,
      reason: 'Only available after a rejection',
      loading: resubmit.isPending.value,
      onClick: resubmitKyc,
    },
    {
      key: 'account',
      group: 'trading' as ActionGroup,
      label: 'Create Trading Account',
      icon: Wallet,
      show: canCreateAccount.value,
      disabled: false,
      reason: '',
      loading: false,
      onClick: openAccount,
    },
    {
      key: 'deposit',
      group: 'finance' as ActionGroup,
      label: 'Create Deposit',
      icon: ArrowDownToLine,
      show: auth.can('finance.deposits.create'),
      disabled: false,
      reason: '',
      loading: false,
      onClick: () => openTxn('deposit'),
    },
    {
      key: 'withdrawal',
      group: 'finance' as ActionGroup,
      label: 'Create Withdrawal',
      icon: ArrowUpFromLine,
      show: auth.can('finance.withdrawals.create'),
      disabled: false,
      reason: '',
      loading: false,
      onClick: () => openTxn('withdrawal'),
    },
    {
      key: 'credit',
      group: 'finance' as ActionGroup,
      label: 'Credit Wallet',
      icon: Gift,
      show: auth.can('finance.credit.manage'),
      disabled: false,
      reason: '',
      loading: false,
      onClick: () => (creditOpen.value = true),
    },
    {
      key: 'transfer',
      group: 'finance' as ActionGroup,
      label: 'Transfer Funds',
      icon: ArrowLeftRight,
      show: auth.can('finance.transfers.create'),
      disabled: false,
      reason: '',
      loading: false,
      onClick: () => (transferOpen.value = true),
    },
  ].filter((a) => a.show),
);

const groupMeta: { key: ActionGroup; title: string; icon: typeof Upload }[] = [
  { key: 'kyc', title: 'KYC', icon: ShieldCheck },
  { key: 'trading', title: 'Trading', icon: Wallet },
  { key: 'finance', title: 'Finance', icon: Layers },
];

const grouped = computed(() =>
  groupMeta
    .map((g) => ({
      ...g,
      actions: actions.value.filter((a) => a.group === g.key),
    }))
    .filter((g) => g.actions.length > 0),
);

/* A short, state-driven KYC hint so the operator always knows what the current
 * step is (and that no manual "Start KYC" is needed). */
const kycHint = computed(() => {
  if (!auth.can('compliance.view')) return '';
  if (latestRejected.value) return 'Application rejected — use Resubmit to open a new attempt.';
  if (draftApp.value) return 'Draft ready to submit for review.';
  if (['submitted', 'under_review'].includes(latestApp.value?.status ?? '')) {
    return 'Awaiting compliance review.';
  }
  return 'Upload a document to start KYC — no separate \u201cStart KYC\u201d step is required.';
});
</script>

<template>
  <section class="rounded-lg border border-border bg-surface p-4">
    <header class="mb-3 flex items-center justify-between">
      <div>
        <h2 class="text-sm font-semibold text-fg">Act on behalf of client</h2>
        <p class="text-xs text-muted">Perform onboarding steps for this client.</p>
      </div>
      <StatusBadge
        v-if="auth.can('compliance.view') && latestApp?.status"
        :status="latestApp.status"
      />
    </header>

    <div v-if="!grouped.length" class="text-sm text-muted">
      You don't have permission to perform client actions.
    </div>

    <div v-else class="space-y-4">
      <section v-for="g in grouped" :key="g.key" :data-section="g.key">
        <h3 class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
          <component :is="g.icon" class="size-3.5" /> {{ g.title }}
        </h3>
        <p v-if="g.key === 'kyc' && kycHint" class="mb-2 text-xs text-muted">{{ kycHint }}</p>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button
            v-for="a in g.actions"
            :key="a.key"
            type="button"
            :disabled="a.disabled || a.loading"
            :title="a.disabled ? a.reason : undefined"
            :class="
              cn(
                'flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2.5 text-left text-sm font-medium text-fg transition-colors',
                'hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                (a.disabled || a.loading) && 'cursor-not-allowed opacity-50 hover:bg-surface',
              )
            "
            @click="a.onClick"
          >
            <component :is="a.icon" class="size-4 shrink-0 text-muted" />
            <span class="truncate">{{ a.label }}</span>
          </button>
        </div>
      </section>
    </div>

    <!-- KYC documents (reuses the compliance documents panel) -->
    <Modal
      :open="docsOpen"
      size="xl"
      title="KYC documents"
      description="Upload and review this client's KYC documents."
      @update:open="docsOpen = $event"
    >
      <div class="max-h-[70vh] overflow-y-auto">
        <DocumentsPanel :client-id="clientId" />
      </div>
    </Modal>

    <!-- trading account (direct or request, by permission) -->
    <DirectAccountDrawer
      :open="directAccountOpen"
      :client-id="clientId"
      @update:open="directAccountOpen = $event"
    />
    <NewAccountDrawer
      :open="requestAccountOpen"
      :client-id="clientId"
      @update:open="requestAccountOpen = $event"
    />

    <!-- finance -->
    <CreateTransactionDrawer
      :open="txnOpen"
      :client-id="clientId"
      :kind="txnKind"
      @update:open="txnOpen = $event"
    />
    <CreditDialog
      :open="creditOpen"
      :client-id="clientId"
      :currency-id="currencyId"
      @update:open="creditOpen = $event"
    />
    <TransferDrawer
      :open="transferOpen"
      :client-id="clientId"
      @update:open="transferOpen = $event"
    />
  </section>
</template>

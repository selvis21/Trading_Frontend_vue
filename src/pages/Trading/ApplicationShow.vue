<script setup lang="ts">
import { computed, ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  ArrowLeft,
  ClipboardList,
  User,
  ShieldCheck,
  Ban,
  Check,
  Info,
  Server,
  FileText,
  History,
} from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import Badge from '@/components/ui/Badge.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Spinner from '@/components/ui/Spinner.vue';
import AccountTypePill from '@/components/trading/AccountTypePill.vue';
import ReasonDialog from '@/components/trading/ReasonDialog.vue';
import DocumentsPanel from '@/components/compliance/DocumentsPanel.vue';
import { timeAgo } from '@/lib/utils';
import { isApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useConfirm } from '@/composables/useConfirm';
import { useToast } from '@/composables/useToast';
import { useApplicationDetail, useApplicationDecision } from '@/queries/applications';

/* Canonical Application Details — one read workflow reused by the Applications
 * list, the client-360° Applications panel and the compliance profile's
 * Applications tab. Approve is gated on the client's KYC (enforced server-side;
 * this page mirrors the server's `can_approve` / reason). */
defineOptions({ layout: null });

const props = defineProps<{ reference: string }>();

const auth = useAuthStore();
const toast = useToast();
const { confirm } = useConfirm();

const record = useApplicationDetail(() => props.reference);
const decision = useApplicationDecision();

const app = computed(() => record.data.value ?? null);
const canApprovePermission = computed(() => auth.can('trading.requests.approve'));
const isPending = computed(() => app.value?.status === 'pending');
const rejectOpen = ref(false);

async function approve() {
  if (!app.value) return;
  const ok = await confirm({
    title: 'Approve application',
    description: `Approve ${app.value.reference} and create the trading account?`,
    confirmLabel: 'Approve',
    tone: 'success',
  });
  if (!ok) return;
  decision.mutate(
    { id: app.value.id, action: 'approve' },
    {
      onSuccess: () => {
        toast.success('Application approved');
        record.refetch();
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}

function reject(reason: string) {
  if (!app.value) return;
  decision.mutate(
    { id: app.value.id, action: 'reject', reason },
    {
      onSuccess: () => {
        toast.success('Application rejected');
        rejectOpen.value = false;
        record.refetch();
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
      <Link href="/trading/applications" class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to applications
      </Link>

      <div v-if="record.isLoading.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading application…" />
      </div>

      <div
        v-else-if="record.isError.value || !app"
        class="mx-auto mt-16 max-w-md rounded-lg border border-border bg-surface p-8 text-center"
      >
        <ClipboardList class="mx-auto size-8 text-muted" />
        <h1 class="mt-3 text-lg font-semibold text-fg">Application not found</h1>
        <p class="mt-1 text-sm text-muted">
          This application does not exist or you do not have access to it.
        </p>
      </div>

      <template v-else>
        <header class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
          <div class="flex items-center gap-3">
            <span class="flex size-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ClipboardList class="size-5" />
            </span>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h1 class="font-mono text-lg font-semibold text-fg">{{ app.reference }}</h1>
                <AccountTypePill :type="app.account_type" />
                <StatusBadge :status="app.status" />
              </div>
              <p class="text-sm text-muted">
                Created {{ app.created_at ? timeAgo(app.created_at) : '—' }}
                · Updated {{ app.updated_at ? timeAgo(app.updated_at) : '—' }}
              </p>
            </div>
          </div>

          <div v-if="canApprovePermission && isPending" class="flex items-center gap-2">
            <Button
              variant="danger"
              @click="rejectOpen = true"
              :disabled="decision.isPending.value"
            >
              <Ban /> Reject
            </Button>
            <Button
              variant="success"
              :disabled="!app.can_approve || decision.isPending.value"
              :loading="decision.isPending.value"
              :title="app.can_approve ? undefined : app.approval_blocked_reason ?? undefined"
              @click="approve"
            >
              <Check /> Approve
            </Button>
          </div>
        </header>

        <!-- Approval blocked explanation (server-derived) -->
        <div
          v-if="canApprovePermission && isPending && !app.can_approve && app.approval_blocked_reason"
          class="flex items-start gap-2 rounded-lg border border-status-warning/40 bg-status-warning/5 p-3 text-sm text-fg"
          data-testid="approval-blocked"
        >
          <Info class="mt-0.5 size-4 shrink-0 text-status-warning" />
          <span>{{ app.approval_blocked_reason }}</span>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <!-- Applicant -->
          <section class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <User class="size-4 text-muted" /> Applicant
            </h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Name</dt>
                <dd class="text-fg">
                  <Link v-if="app.client_id" :href="`/clients/${app.client_id}`" class="text-primary hover:underline">
                    {{ app.client?.name || app.client?.client_code || `Client #${app.client_id}` }}
                  </Link>
                  <Link v-else-if="app.lead_id" :href="`/leads/${app.lead_id}`" class="text-primary hover:underline">
                    {{ app.lead?.name || `Lead #${app.lead_id}` }}
                  </Link>
                  <span v-else>—</span>
                </dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Client code</dt>
                <dd class="font-mono text-fg">{{ app.client?.client_code ?? '—' }}</dd>
              </div>
              <div v-if="!app.client_id && app.lead_id" class="flex justify-between gap-3">
                <dt class="text-muted">Originating lead</dt>
                <dd class="font-mono text-fg">#{{ app.lead_id }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Email</dt>
                <dd class="text-fg">{{ app.client?.email ?? app.lead?.email ?? '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Mobile</dt>
                <dd class="text-fg">{{ app.client?.mobile ?? app.lead?.mobile ?? '—' }}</dd>
              </div>
            </dl>
          </section>

          <!-- KYC -->
          <section class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <ShieldCheck class="size-4 text-muted" /> KYC
            </h2>
            <div class="flex items-center gap-2">
              <StatusBadge
                :status="app.kyc_approved ? 'approved' : (app.kyc_status ?? 'not_started')"
                :label="app.kyc_approved ? 'Approved' : undefined"
              />
              <span class="text-xs text-muted">
                Required before approval — for every application type (Demo, Live, IB).
              </span>
            </div>
            <Link
              v-if="app.client_id && auth.can('compliance.view')"
              :href="`/compliance/profiles/${app.client_id}`"
              class="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Open KYC profile
            </Link>
          </section>

          <!-- Application fields -->
          <section class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Server class="size-4 text-muted" /> Application
            </h2>
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Type</dt>
                <dd><AccountTypePill :type="app.account_type" /></dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Platform</dt>
                <dd class="text-fg">{{ app.platform?.name ?? '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Requested leverage</dt>
                <dd class="text-fg">{{ app.requested_leverage ?? '—' }}</dd>
              </div>
              <div class="flex justify-between gap-3">
                <dt class="text-muted">Score</dt>
                <dd class="text-fg">
                  {{ app.score ?? '—' }}
                  <Badge v-if="app.score_band" tone="info" class="ms-1">{{ app.score_band }}</Badge>
                </dd>
              </div>
            </dl>
            <p class="mt-3 text-xs text-muted">
              Questionnaire/declaration answers are captured at submission and reviewed in the
              client's KYC; they are not stored as Application-level values.
            </p>
          </section>

          <!-- Account / decision -->
          <section class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 text-sm font-semibold text-fg">Outcome</h2>
            <div v-if="app.trading_account_id || app.account?.login" class="space-y-1 text-sm">
              <p class="text-muted">Trading account</p>
              <p class="font-mono text-fg">{{ app.account?.login ?? `#${app.trading_account_id}` }}</p>
              <StatusBadge v-if="app.account?.status" :status="app.account.status" />
            </div>
            <div v-else-if="app.decision_reason" class="text-sm">
              <p class="text-muted">Decision reason</p>
              <p class="text-fg">{{ app.decision_reason }}</p>
            </div>
            <p v-else-if="app.is_draft" class="text-sm text-muted">
              Draft opened from the lead — a trading account is created once a Demo/Live application is submitted and approved.
            </p>
            <p v-else class="text-sm text-muted">No account created yet.</p>
          </section>
        </div>

        <!-- Timeline: the application's real lifecycle events -->
        <section v-if="app.activities?.length" class="rounded-lg border border-border bg-surface p-4">
          <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <History class="size-4 text-muted" /> Timeline
          </h2>
          <ul class="space-y-2.5">
            <li v-for="a in app.activities" :key="a.id" class="flex items-start gap-2.5 text-sm">
              <span class="mt-1 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
              <div>
                <p class="text-fg">{{ a.description ?? a.type ?? 'Event' }}</p>
                <p class="text-xs text-muted">{{ a.created_at ? timeAgo(a.created_at) : '' }}</p>
              </div>
            </li>
          </ul>
        </section>

        <!-- Documents: the client's KYC documents (reused panel, real data) -->
        <section
          v-if="app.client_id && auth.can('compliance.view')"
          class="rounded-lg border border-border bg-surface p-4"
        >
          <h2 class="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <FileText class="size-4 text-muted" /> KYC documents
          </h2>
          <DocumentsPanel :client-id="app.client_id" />
        </section>

        <ReasonDialog
          :open="rejectOpen"
          title="Reject application"
          description="A reason is required and is recorded on the application."
          confirm-label="Reject application"
          tone="danger"
          reason-required
          :loading="decision.isPending.value"
          @update:open="rejectOpen = $event"
          @confirm="reject"
        />
      </template>
    </div>
  </AppLayout>
</template>

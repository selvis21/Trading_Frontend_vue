<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  CircleUserRound,
  ShieldCheck,
  MapPin,
  Play,
  Check,
  Ban,
  FileText,
} from '@lucide/vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import StatCard from '@/components/metrics/StatCard.vue';
import Button from '@/components/ui/Button.vue';
import Spinner from '@/components/ui/Spinner.vue';
import RiskBadge from './RiskBadge.vue';
import SlaIndicator from './SlaIndicator.vue';
import ReasonDialog from './ReasonDialog.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useClientKyc, useApplicationTransition } from '@/queries/compliance';
import { useAuthStore } from '@/stores/auth';
import { useToast } from '@/composables/useToast';
import { isApiError } from '@/services/api';
import type { KycApplication } from '@/types/compliance';

/* Centre panel: the client's KYC profile + the selected application, with
 * the decision actions gated by status + permission. */
const props = defineProps<{
  clientId: number;
  application: KycApplication | null;
}>();
const emit = defineEmits<{ changed: [] }>();

const auth = useAuthStore();
const toast = useToast();
const profile = useClientKyc(() => props.clientId);
const transition = useApplicationTransition();

const status = computed(() => props.application?.status);
const dialog = ref<{ open: boolean; action: 'approve' | 'reject' }>({
  open: false,
  action: 'approve',
});

function startReview() {
  if (!props.application) return;
  transition.mutate(
    { id: props.application.id, action: 'review', clientId: props.clientId },
    {
      onSuccess: () => {
        toast.success('Review started');
        emit('changed');
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
function openDecision(action: 'approve' | 'reject') {
  dialog.value = { open: true, action };
}
function confirmDecision(reason: string) {
  if (!props.application) return;
  transition.mutate(
    { id: props.application.id, action: dialog.value.action, reason, clientId: props.clientId },
    {
      onSuccess: () => {
        toast.success(dialog.value.action === 'approve' ? 'Application approved' : 'Application rejected');
        dialog.value.open = false;
        emit('changed');
      },
      onError: (e) => isApiError(e) && toast.fromError(e),
    },
  );
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div v-if="!application" class="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted">
      <FileText class="size-10 opacity-40" />
      <p class="text-sm">Select an application from the queue to review.</p>
    </div>

    <template v-else>
      <!-- client + profile header -->
      <header class="border-b border-border p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <span class="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CircleUserRound class="size-6" />
            </span>
            <div>
              <h2 class="text-base font-semibold text-fg">Client #{{ clientId }}</h2>
              <div class="mt-0.5 flex items-center gap-2">
                <StatusBadge v-if="profile.data.value" :status="profile.data.value.status" />
                <RiskBadge v-if="profile.data.value" :risk="profile.data.value.risk_level" />
              </div>
            </div>
          </div>
          <SlaIndicator v-if="status === 'submitted' || status === 'under_review'" :since="application.submitted_at" />
        </div>

        <!-- verification flags -->
        <div v-if="profile.data.value" class="mt-3 grid grid-cols-2 gap-3">
          <StatCard
            label="Identity"
            :value="profile.data.value.identity_verified ? 'Verified' : 'Pending'"
            :icon="ShieldCheck"
            :tone="profile.data.value.identity_verified ? 'success' : 'warning'"
          />
          <StatCard
            label="Address"
            :value="profile.data.value.address_verified ? 'Verified' : 'Pending'"
            :icon="MapPin"
            :tone="profile.data.value.address_verified ? 'success' : 'warning'"
          />
        </div>
        <Spinner v-else-if="profile.isLoading.value" class="mt-3" />
      </header>

      <!-- application -->
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        <div class="rounded-lg border border-border bg-surface p-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-fg">Application #{{ application.id }}</p>
              <p class="text-xs text-muted">Attempt {{ application.attempt }}</p>
            </div>
            <StatusBadge :status="application.status" />
          </div>

          <dl class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><dt class="text-xs text-muted">Submitted</dt><dd class="text-fg">{{ application.submitted_at ? timeAgo(application.submitted_at) : '—' }}</dd></div>
            <div><dt class="text-xs text-muted">Reviewed</dt><dd class="text-fg">{{ application.reviewed_at ? timeAgo(application.reviewed_at) : '—' }}</dd></div>
            <div class="col-span-2"><dt class="text-xs text-muted">Documents</dt><dd class="text-fg">{{ application.documents?.length ?? 0 }} attached</dd></div>
          </dl>

          <div
            v-if="application.decision_reason"
            :class="cn('mt-3 rounded-md p-2.5 text-sm', status === 'rejected' ? 'bg-status-danger/5 text-status-danger' : 'bg-status-success/5 text-status-success')"
          >
            {{ application.decision_reason }}
          </div>

          <!-- actions -->
          <div class="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Button
              v-if="status === 'submitted' && auth.can('compliance.review')"
              variant="info"
              :loading="transition.isPending.value"
              @click="startReview"
            >
              <Play class="size-4" /> Start review
            </Button>
            <template v-if="status === 'under_review'">
              <Button
                v-if="auth.can('compliance.approve')"
                variant="success"
                :loading="transition.isPending.value"
                @click="openDecision('approve')"
              >
                <Check class="size-4" /> Approve
              </Button>
              <Button
                v-if="auth.can('compliance.reject')"
                variant="danger"
                @click="openDecision('reject')"
              >
                <Ban class="size-4" /> Reject
              </Button>
            </template>
            <span
              v-if="status === 'approved' || status === 'rejected'"
              class="text-sm text-muted"
            >
              Decision recorded — no further action.
            </span>
          </div>
        </div>
      </div>

      <ReasonDialog
        :open="dialog.open"
        :title="dialog.action === 'approve' ? 'Approve application' : 'Reject application'"
        :description="dialog.action === 'approve' ? 'Optionally note why this passed.' : 'A reason is required and recorded.'"
        :confirm-label="dialog.action === 'approve' ? 'Approve' : 'Reject'"
        :tone="dialog.action === 'approve' ? 'success' : 'danger'"
        :reason-required="dialog.action === 'reject'"
        :loading="transition.isPending.value"
        @update:open="dialog.open = $event"
        @confirm="confirmDecision"
      />
    </template>
  </div>
</template>

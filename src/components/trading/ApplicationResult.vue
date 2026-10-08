<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle2, Hash, RefreshCcw } from '@lucide/vue';
import Badge from '@/components/ui/Badge.vue';
import { cn } from '@/lib/utils';
import { LIFECYCLE_ACTION_LABELS } from '@/types/trading';
import type { ApplicationSubmission } from '@/types/applications';

/* The post-submission result panel for the Applications screens.
 *
 * Shows the reference prominently (the identifier a customer quotes on the
 * phone), whether this response was a fresh submission or an idempotent
 * replay, and the lifecycle slice exactly as the shared intake service
 * returned it — including the honest Application Score state: the panel
 * renders only what the backend reports, never a derived or invented value. */
const props = defineProps<{ result: ApplicationSubmission }>();

const stateClass: Record<string, string> = {
  done: 'text-status-success',
  current: 'text-primary font-semibold',
  pending: 'text-muted',
  skipped: 'text-muted opacity-60',
};

const currentStage = computed(
  () => props.result.lifecycle.stages.find((s) => s.state === 'current') ?? null,
);

const nextActions = computed(() =>
  (props.result.lifecycle.next_actions ?? []).map(
    (key) => LIFECYCLE_ACTION_LABELS[key] ?? key.replace(/_/g, ' '),
  ),
);
</script>

<template>
  <section class="space-y-3" data-testid="application-result">
    <div class="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted-surface/50 p-3">
      <CheckCircle2 class="size-5 shrink-0 text-status-success" />
      <div class="min-w-0 flex-1">
        <p class="text-xs text-muted">Application reference</p>
        <p
          class="font-mono text-lg font-semibold text-fg"
          data-testid="application-reference"
        >
          {{ result.reference }}
        </p>
      </div>
      <Badge :tone="result.replayed ? 'neutral' : 'success'" data-testid="application-replayed">
        <span class="inline-flex items-center gap-1">
          <RefreshCcw v-if="result.replayed" class="size-3" />
          {{ result.replayed ? 'Replayed (already received)' : 'Submitted' }}
        </span>
      </Badge>
    </div>

    <dl class="grid grid-cols-1 gap-x-6 gap-y-1 rounded-md border border-border p-3 text-sm sm:grid-cols-2">
      <div class="flex items-center gap-2">
        <dt class="text-muted">Applicant:</dt>
        <dd class="font-medium text-fg" data-testid="result-client-name">
          {{ result.client.name }}
          <span v-if="result.client.client_code" class="font-mono text-xs text-muted">
            ({{ result.client.client_code }})
          </span>
        </dd>
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-muted">Type:</dt>
        <dd class="font-medium uppercase text-fg" data-testid="result-type">
          {{ result.application.type }}
        </dd>
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-muted">Status:</dt>
        <dd>
          <Badge tone="info" data-testid="result-status">
            {{ result.application.status ?? '—' }}
          </Badge>
        </dd>
      </div>
      <div class="flex items-center gap-2">
        <Hash class="size-3.5 text-muted" />
        <dt class="sr-only">KYC</dt>
        <dd class="text-xs text-muted" data-testid="result-kyc">
          KYC {{ result.kyc.verified ? 'verified' : 'not verified yet' }}
        </dd>
      </div>
    </dl>

    <div class="rounded-md border border-border bg-muted-surface/50 p-3" data-testid="result-lifecycle">
      <p class="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Trading lifecycle
      </p>
      <div class="mb-2 flex items-center gap-2 text-sm">
        <span class="text-muted">Current stage:</span>
        <span class="font-medium text-fg" data-testid="result-current-stage">
          {{ currentStage?.label ?? '—' }}
        </span>
      </div>
      <ul class="mb-3 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <li
          v-for="stage in result.lifecycle.stages"
          :key="stage.key"
          :class="cn('flex items-center gap-1.5 text-xs', stateClass[stage.state])"
          :data-testid="`result-stage-${stage.key}`"
        >
          <span class="size-1.5 shrink-0 rounded-full bg-current" />
          <span class="truncate">{{ stage.label }}</span>
        </li>
      </ul>
      <div v-if="nextActions.length">
        <p class="mb-1 text-xs text-muted">Available next actions:</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="action in nextActions"
            :key="action"
            class="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-fg"
            :data-testid="`result-next-action-${action.toLowerCase().replace(/\s+/g, '-')}`"
          >
            {{ action }}
          </span>
        </div>
      </div>
    </div>
  </section>
</template>

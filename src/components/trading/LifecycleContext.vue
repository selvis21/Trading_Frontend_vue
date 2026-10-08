<script setup lang="ts">
import { computed } from 'vue';
import { CircleDot, GitBranch } from '@lucide/vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn } from '@/lib/utils';
import {
  LIFECYCLE_ACTION_LABELS,
  type LifecycleStageState,
  type TradingLifecycle,
} from '@/types/trading';

/* Trading lifecycle context for the client-first account workflow.
 *
 * Every stage, current step and available action below comes straight from
 * GET /clients/{client}/trading-lifecycle — the backend remains the source of
 * truth for the workflow. Nothing here decides business rules; it only renders
 * what the read-model reports (done / current / pending / skipped stages plus
 * the operations valid right now). */
const props = defineProps<{
  lifecycle: TradingLifecycle | null;
  loading?: boolean;
}>();

const stateClass: Record<LifecycleStageState, string> = {
  done: 'text-status-success',
  current: 'text-primary font-semibold',
  pending: 'text-muted',
  skipped: 'text-muted opacity-60',
};

const currentStage = computed(
  () => props.lifecycle?.stages.find((s) => s.state === 'current') ?? null,
);

const nextActions = computed(() =>
  (props.lifecycle?.next_actions ?? []).map((key) => ({
    key,
    label: LIFECYCLE_ACTION_LABELS[key] ?? key.replace(/_/g, ' '),
  })),
);

/** A live application exists but the read-model reports no score yet. */
const awaitingScore = computed(
  () =>
    props.lifecycle !== null &&
    props.lifecycle.application_score === null &&
    props.lifecycle.applications.some((a) => a.account_type === 'live'),
);
</script>

<template>
  <section
    class="rounded-md border border-border bg-muted-surface/50 p-3"
    data-testid="lifecycle-context"
  >
    <header class="mb-2 flex items-center gap-1.5">
      <GitBranch class="size-3.5 text-muted" />
      <h3 class="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Trading lifecycle
      </h3>
    </header>

    <div v-if="loading" class="py-1">
      <Spinner label="Loading lifecycle…" />
    </div>

    <div v-else-if="!lifecycle" class="text-xs text-muted">
      Lifecycle context is unavailable for this client.
    </div>

    <template v-else>
      <!-- current stage -->
      <div class="mb-2 flex items-center gap-2 text-sm">
        <span class="text-muted">Current stage:</span>
        <span class="font-medium text-fg" data-testid="lifecycle-current-stage">
          {{ lifecycle.is_complete ? 'Complete' : (currentStage?.label ?? '—') }}
        </span>
      </div>

      <!-- stages (labels + state, straight from the backend) -->
      <ul class="mb-3 grid grid-cols-2 gap-x-3 gap-y-0.5">
        <li
          v-for="stage in lifecycle.stages"
          :key="stage.key"
          :class="cn('flex items-center gap-1.5 text-xs', stateClass[stage.state])"
          :data-testid="`stage-${stage.key}`"
          :title="stage.next_action ?? undefined"
        >
          <CircleDot class="size-2.5 shrink-0" />
          <span class="truncate">{{ stage.label }}</span>
        </li>
      </ul>

      <!-- available next actions, from the backend -->
      <div v-if="nextActions.length" class="mb-2">
        <p class="mb-1 text-xs text-muted">Available next actions:</p>
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="action in nextActions"
            :key="action.key"
            class="rounded border border-border bg-surface px-1.5 py-0.5 text-xs text-fg"
            :data-testid="`next-action-${action.key}`"
          >
            {{ action.label }}
          </span>
        </div>
      </div>

      <!-- Application Score: only what the backend reports. -->
      <div v-if="lifecycle.application_score" class="mb-2 text-xs text-muted">
        Application score:
        <span class="font-medium text-fg">{{ lifecycle.application_score.score ?? '—' }}</span>
        <span v-if="lifecycle.application_score.band"> · {{ lifecycle.application_score.band }}</span>
        <span v-if="lifecycle.application_score.source"> · {{ lifecycle.application_score.source }}</span>
      </div>
      <div v-else-if="awaitingScore" class="mb-2 text-xs text-muted">
        Live application not yet scored.
      </div>

      <!-- existing records (broker provisioning is a stub — real status only) -->
      <div v-if="lifecycle.applications.length" class="text-xs text-muted">
        Applications:
        <span
          v-for="app in lifecycle.applications"
          :key="app.id"
          class="mr-2 inline-flex items-center gap-1"
        >
          <span class="text-fg">{{ app.account_type ?? '—' }}</span> · {{ app.status ?? '—' }}
        </span>
      </div>
      <div v-if="lifecycle.accounts.length" class="mt-1 text-xs text-muted">
        Accounts:
        <span
          v-for="acc in lifecycle.accounts"
          :key="acc.id"
          class="mr-2 inline-flex items-center gap-1"
        >
          <span class="font-mono text-fg">{{ acc.login ?? `#${acc.id}` }}</span>
          · {{ acc.account_type ?? '—' }} · {{ acc.status ?? '—' }}
        </span>
      </div>
    </template>
  </section>
</template>

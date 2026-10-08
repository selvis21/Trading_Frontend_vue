<script setup lang="ts">
import { UserRound } from '@lucide/vue';
import Avatar from '@/components/ui/Avatar.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn } from '@/lib/utils';
import type { Client } from '@/types/sales';

/* The "Selected Client" summary shown in the client-first account workflow.
 * Shows the human identity (name / contact / client code) — never the raw
 * numeric id — plus a "Change client" action unless the workflow is locked
 * to this client (launched from a client profile). */
const props = defineProps<{
  client: Client | null;
  loading?: boolean;
  locked?: boolean;
}>();
const emit = defineEmits<{ change: [] }>();

function display(c: Client): string {
  return c.display_name || c.name || c.client_code || 'Client';
}
function contact(c: Client): string {
  return c.email || c.mobile || '';
}
</script>

<template>
  <div
    class="rounded-md border border-primary/30 bg-primary/5 px-3 py-2.5"
    data-testid="selected-client-card"
  >
    <div class="mb-1 flex items-center gap-1.5">
      <UserRound class="size-3.5 text-primary" />
      <span class="text-[11px] font-semibold uppercase tracking-wide text-muted">
        Selected client
      </span>
    </div>

    <div v-if="loading && !props.client" class="flex items-center gap-2 py-1">
      <Spinner label="Loading client…" />
    </div>

    <template v-else-if="props.client">
      <div class="flex items-start gap-2.5">
        <Avatar :name="display(props.client)" size="sm" class="mt-0.5" />
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-semibold text-fg" data-testid="selected-client-name">
            {{ display(props.client) }}
          </div>
          <div v-if="contact(props.client)" class="truncate text-xs text-muted">
            {{ contact(props.client) }}
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span class="font-mono text-fg" data-testid="selected-client-code">
              Client Code: {{ props.client.client_code ?? '—' }}
            </span>
            <span
              v-if="props.client.is_contact_only"
              class="rounded bg-muted-surface px-1.5 py-0.5 text-[11px] text-muted"
            >
              Contact only
            </span>
            <span
              :class="
                cn(
                  'rounded px-1.5 py-0.5 text-[11px]',
                  props.client.kyc_verified ? 'bg-status-success/10 text-status-success' : 'bg-muted-surface text-muted',
                )
              "
            >
              KYC {{ props.client.kyc_verified ? 'verified' : 'not verified' }}
            </span>
          </div>
        </div>
        <button
          v-if="!locked"
          type="button"
          class="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-fg transition-colors hover:bg-muted-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="change-client"
          @click="emit('change')"
        >
          Change client
        </button>
      </div>
    </template>
  </div>
</template>

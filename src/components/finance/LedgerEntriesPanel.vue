<script setup lang="ts">
import { Receipt } from '@lucide/vue';
import Badge from '@/components/ui/Badge.vue';
import MoneyAmount from './MoneyAmount.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { timeAgo } from '@/lib/utils';
import type { LedgerEntry } from '@/types/finance';

/* Append-only ledger entries for a transaction (or wallet page). Each row
 * shows the movement (signed/coloured) and the running balance
 * before → after. Money is integer minor units rendered via MoneyAmount;
 * the immutability is stated explicitly. */
defineProps<{
  entries: LedgerEntry[];
  loading?: boolean;
  /** Hide the "append-only" framing note (e.g. inside a dense drawer). */
  hideNote?: boolean;
}>();

function kindLabel(k: string | null): string {
  return (k ?? '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
</script>

<template>
  <div class="space-y-2">
    <EmptyState
      v-if="!loading && !entries.length"
      :icon="Receipt"
      title="No ledger entries"
      description="Ledger entries are posted when the transaction completes."
      class="border-0"
    />
    <div v-else class="overflow-x-auto rounded-lg border border-border bg-surface">
      <table class="w-full border-collapse text-sm">
        <thead>
          <tr class="border-b border-border bg-surface-sunken text-xs uppercase tracking-wide text-muted">
            <th class="px-3 py-2 text-start font-semibold">Kind</th>
            <th class="px-3 py-2 text-start font-semibold">Balance</th>
            <th class="px-3 py-2 text-end font-semibold">Amount</th>
            <th class="px-3 py-2 text-end font-semibold">Before → After</th>
            <th class="px-3 py-2 text-end font-semibold">When</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="e.id" class="border-b border-border last:border-0">
            <td class="px-3 py-2">
              <div class="flex items-center gap-1.5">
                <span class="font-medium text-fg">{{ kindLabel(e.kind) }}</span>
              </div>
            </td>
            <td class="px-3 py-2">
              <Badge :tone="e.balance_type === 'credit' ? 'accent' : 'neutral'">
                {{ e.balance_type === 'credit' ? 'Credit' : 'Cash' }}
              </Badge>
            </td>
            <td class="px-3 py-2 text-end">
              <MoneyAmount
                :minor="e.amount"
                :currency-id="e.currency_id"
                :direction="e.direction === 'credit' ? 'in' : 'out'"
                colored
                strong
              />
            </td>
            <td class="px-3 py-2 text-end text-muted">
              <MoneyAmount :minor="e.balance_before" :currency-id="e.currency_id" />
              <span class="mx-1">→</span>
              <MoneyAmount :minor="e.balance_after" :currency-id="e.currency_id" class="text-fg" />
            </td>
            <td class="px-3 py-2 text-end text-xs text-muted">{{ timeAgo(e.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!hideNote && entries.length" class="text-[11px] text-muted">
      Append-only — ledger entries cannot be edited.
    </p>
  </div>
</template>

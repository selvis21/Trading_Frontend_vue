<script setup lang="ts">
import { ref, watch } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ExternalLink, History, ListTree, Inbox } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import AccountProfilePanel from './AccountProfilePanel.vue';
import AccountTimelinePanel from './AccountTimelinePanel.vue';
import AccountStatusHistoryPanel from './AccountStatusHistoryPanel.vue';
import AccountRequestsPanel from './AccountRequestsPanel.vue';
import { cn } from '@/lib/utils';
import type { TradingAccount } from '@/types/trading';

/* Drawer-first account view: profile + lifecycle actions over a tabbed
 * activity rail. Keeps the operator in the accounts list while acting on
 * one account. URL-addressability is owned by the parent page. */
const props = defineProps<{
  open: boolean;
  account: TradingAccount | null;
}>();
const emit = defineEmits<{ 'update:open': [v: boolean]; changed: [] }>();

type Tab = 'activities' | 'history' | 'requests';
const tab = ref<Tab>('activities');
const tabs: { key: Tab; label: string; icon: typeof History }[] = [
  { key: 'activities', label: 'Activities', icon: ListTree },
  { key: 'history', label: 'Status history', icon: History },
  { key: 'requests', label: 'Requests', icon: Inbox },
];

// Reset the rail to the activity tab whenever a different account opens.
watch(
  () => props.account?.id,
  () => (tab.value = 'activities'),
);
</script>

<template>
  <Sheet
    :open="open"
    side="right"
    width="44rem"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div class="flex w-full items-center justify-between gap-3">
        <div class="min-w-0">
          <h2 class="truncate font-mono text-sm font-semibold text-fg" dir="ltr">
            {{ account?.login ?? (account ? `Account #${account.id}` : 'Account') }}
          </h2>
          <p class="truncate text-xs text-muted">Client #{{ account?.client_id }}</p>
        </div>
        <Link
          v-if="account"
          :href="`/trading/accounts/${account.id}`"
          class="inline-flex shrink-0 items-center gap-1 text-xs text-muted hover:text-fg"
        >
          <ExternalLink class="size-3.5" /> Full page
        </Link>
      </div>
    </template>

    <div v-if="account" class="-mx-5 -my-4">
      <!-- profile + details + actions -->
      <AccountProfilePanel
        :key="account.id"
        :account-id="account.id"
        :fallback="account"
        @changed="emit('changed')"
      />

      <!-- activity rail -->
      <div class="border-t border-border">
        <div class="flex gap-1 border-b border-border p-2">
          <button
            v-for="t in tabs"
            :key="t.key"
            :class="
              cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                tab === t.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
              )
            "
            @click="tab = t.key"
          >
            <component :is="t.icon" class="size-3.5" /> {{ t.label }}
          </button>
        </div>
        <div class="p-4">
          <AccountTimelinePanel v-if="tab === 'activities'" :key="`a${account.id}`" :account-id="account.id" />
          <AccountStatusHistoryPanel v-else-if="tab === 'history'" :key="`h${account.id}`" :account-id="account.id" />
          <AccountRequestsPanel
            v-else
            :key="`r${account.id}`"
            :client-id="account.client_id"
            :account-id="account.id"
          />
        </div>
      </div>
    </div>
  </Sheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import { Link } from '@inertiajs/vue3';
import { Columns3, History, Inbox, ListTree, LayoutList } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import AccountQueue from '@/components/trading/AccountQueue.vue';
import AccountProfilePanel from '@/components/trading/AccountProfilePanel.vue';
import AccountTimelinePanel from '@/components/trading/AccountTimelinePanel.vue';
import AccountStatusHistoryPanel from '@/components/trading/AccountStatusHistoryPanel.vue';
import AccountRequestsPanel from '@/components/trading/AccountRequestsPanel.vue';
import { cn } from '@/lib/utils';
import { useTradingAccounts, useTradingAccount } from '@/queries/trading';
import {
  ACCOUNT_VIEW_STATUS,
  type AccountView,
  type TradingAccount,
} from '@/types/trading';

/* Trading operations workspace — the three-panel cockpit.
 *  LEFT   Account Queue (status views, j/k navigation)
 *  CENTER Trading Account Profile · Client Summary · Account Details
 *  RIGHT  Timeline (status history) · Requests · Activities
 */
defineOptions({ layout: null });

const view = ref<AccountView>('active');
const pageSize = ref(25);
const selectedId = ref<number | null>(null);

const params = computed(() => ({
  status: ACCOUNT_VIEW_STATUS[view.value],
  page_size: pageSize.value,
}));
const list = useTradingAccounts(params);
const accounts = computed(() => list.data.value?.rows ?? []);
const hasMore = computed(() => accounts.value.length < (list.data.value?.total ?? 0));

const detail = useTradingAccount(selectedId);
const activeAccount = computed<TradingAccount | null>(
  () => detail.data.value ?? accounts.value.find((a) => a.id === selectedId.value) ?? null,
);
const activeClientId = computed(() => activeAccount.value?.client_id ?? null);

watch(view, () => (selectedId.value = null));
// Auto-select the first row so the cockpit is never empty on load/refilter.
watch(accounts, (rows) => {
  if (selectedId.value === null && rows.length) selectedId.value = rows[0].id;
});

function select(account: TradingAccount) {
  selectedId.value = account.id;
}

function move(delta: number) {
  const i = accounts.value.findIndex((a) => a.id === selectedId.value);
  const next = accounts.value[Math.max(0, Math.min(accounts.value.length - 1, i + delta))];
  if (next) selectedId.value = next.id;
}
onKeyStroke(['j', 'J'], (e) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  move(1);
});
onKeyStroke(['k', 'K'], (e) => {
  if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
  move(-1);
});

const rightTab = ref<'timeline' | 'requests' | 'activities'>('activities');
const rightTabs = [
  { key: 'activities' as const, label: 'Activities', icon: ListTree },
  { key: 'requests' as const, label: 'Requests', icon: Inbox },
  { key: 'timeline' as const, label: 'Timeline', icon: History },
];

function onChanged() {
  list.refetch();
  detail.refetch();
}
</script>

<template>
  <AppLayout>
    <div class="flex h-[calc(100dvh-3.5rem)] flex-col">
      <!-- header -->
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div class="flex items-center gap-2.5">
          <Columns3 class="size-5 text-primary" />
          <div>
            <h1 class="text-lg font-semibold tracking-tight text-fg">Trading Workspace</h1>
            <p class="text-xs text-muted">Account cockpit · <kbd class="font-mono">j</kbd>/<kbd class="font-mono">k</kbd> to navigate</p>
          </div>
        </div>
        <Link href="/trading/accounts">
          <Button variant="outline" size="sm"><LayoutList class="size-4" /> All accounts</Button>
        </Link>
      </header>

      <!-- three panels -->
      <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
        <!-- LEFT: account queue -->
        <div class="h-72 shrink-0 border-b border-border lg:h-auto lg:w-80 lg:border-b-0 lg:border-e">
          <AccountQueue
            :accounts="accounts"
            :loading="list.isLoading.value"
            :view="view"
            :selected-id="selectedId"
            :total="list.data.value?.total"
            :has-more="hasMore"
            @update:view="view = $event"
            @select="select"
            @load-more="pageSize += 25"
          />
        </div>

        <!-- CENTER: profile + client summary + details -->
        <div class="min-h-0 flex-1 border-b border-border lg:border-b-0 lg:border-e">
          <AccountProfilePanel
            v-if="selectedId"
            :key="selectedId"
            :account-id="selectedId"
            :fallback="activeAccount"
            @changed="onChanged"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-muted">
            Select an account to begin.
          </div>
        </div>

        <!-- RIGHT: timeline / requests / activities -->
        <aside class="flex h-96 shrink-0 flex-col lg:h-auto lg:w-96">
          <div class="flex shrink-0 gap-1 border-b border-border p-2">
            <button
              v-for="t in rightTabs"
              :key="t.key"
              :class="
                cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                  rightTab === t.key ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-muted-surface hover:text-fg',
                )
              "
              @click="rightTab = t.key"
            >
              <component :is="t.icon" class="size-3.5" /> {{ t.label }}
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto p-3">
            <template v-if="selectedId">
              <AccountTimelinePanel v-if="rightTab === 'activities'" :key="`a${selectedId}`" :account-id="selectedId" />
              <AccountRequestsPanel
                v-else-if="rightTab === 'requests' && activeClientId"
                :key="`r${selectedId}`"
                :client-id="activeClientId"
                :account-id="selectedId"
              />
              <AccountStatusHistoryPanel v-else-if="rightTab === 'timeline'" :key="`t${selectedId}`" :account-id="selectedId" />
            </template>
            <div v-else class="flex h-full items-center justify-center text-center text-sm text-muted">
              No account selected.
            </div>
          </div>
        </aside>
      </div>
    </div>
  </AppLayout>
</template>

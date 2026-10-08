<script setup lang="ts">
import { computed, ref } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, Info, Inbox, History, ListTree } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import AccountProfilePanel from '@/components/trading/AccountProfilePanel.vue';
import AccountRequestsPanel from '@/components/trading/AccountRequestsPanel.vue';
import AccountStatusHistoryPanel from '@/components/trading/AccountStatusHistoryPanel.vue';
import AccountTimelinePanel from '@/components/trading/AccountTimelinePanel.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { cn } from '@/lib/utils';
import { useTradingAccount } from '@/queries/trading';

/* Full-page trading account detail. Tabs: Overview (profile + lifecycle
 * actions + details), Requests (the client's open-account requests), Status
 * History (transition audit), Activities (infinite activity stream).
 * `accountId` comes from the route. */
defineOptions({ layout: null });

const props = defineProps<{ accountId: number }>();
const account = useTradingAccount(() => props.accountId);
const clientId = computed(() => account.data.value?.client_id ?? null);

type Tab = 'overview' | 'requests' | 'history' | 'activities';
const tab = ref<Tab>('overview');
const tabs: { key: Tab; label: string; icon: typeof Info }[] = [
  { key: 'overview', label: 'Overview', icon: Info },
  { key: 'requests', label: 'Requests', icon: Inbox },
  { key: 'history', label: 'Status History', icon: History },
  { key: 'activities', label: 'Activities', icon: ListTree },
];
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-5xl p-4 sm:p-6">
      <Link href="/trading/accounts" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to accounts
      </Link>

      <div v-if="account.isLoading.value && !account.data.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading account…" />
      </div>

      <template v-else>
        <!-- tabs -->
        <nav class="mb-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.key"
            role="tab"
            :aria-selected="tab === t.key"
            :class="
              cn(
                'flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                tab === t.key ? 'border-primary text-fg' : 'border-transparent text-muted hover:text-fg',
              )
            "
            @click="tab = t.key"
          >
            <component :is="t.icon" class="size-4" /> {{ t.label }}
          </button>
        </nav>

        <!-- OVERVIEW -->
        <div v-if="tab === 'overview'" class="rounded-lg border border-border bg-surface">
          <AccountProfilePanel :account-id="accountId" @changed="account.refetch()" />
        </div>

        <!-- REQUESTS -->
        <AccountRequestsPanel v-else-if="tab === 'requests' && clientId" :client-id="clientId" :account-id="accountId" />

        <!-- STATUS HISTORY -->
        <AccountStatusHistoryPanel v-else-if="tab === 'history'" :account-id="accountId" />

        <!-- ACTIVITIES -->
        <AccountTimelinePanel v-else-if="tab === 'activities'" :account-id="accountId" />
      </template>
    </div>
  </AppLayout>
</template>

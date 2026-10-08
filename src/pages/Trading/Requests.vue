<script setup lang="ts">
import { computed, ref, watch, defineAsyncComponent } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import { Link } from '@inertiajs/vue3';
import { Inbox, Plus, LayoutList } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import RequestQueue from '@/components/trading/RequestQueue.vue';
import RequestReviewPanel from '@/components/trading/RequestReviewPanel.vue';
import { useAuthStore } from '@/stores/auth';
import { useTradingRequests } from '@/queries/trading';
import {
  REQUEST_VIEW_STATUS,
  type RequestView,
  type TradingAccountRequest,
} from '@/types/trading';

/* Open-account request queue (inbox shell): a prioritised list of requests
 * on the left, a review pane on the right with the KYC gate and the
 * approve/reject decision. j/k advances through the queue hands-free. */
defineOptions({ layout: null });

const NewAccountDrawer = defineAsyncComponent(
  () => import('@/components/trading/NewAccountDrawer.vue'),
);

const auth = useAuthStore();
const view = ref<RequestView>('pending');
const pageSize = ref(25);
const selectedId = ref<number | null>(null);

const params = computed(() => ({
  status: REQUEST_VIEW_STATUS[view.value],
  page_size: pageSize.value,
}));
const list = useTradingRequests(params);
const requests = computed(() => list.data.value?.rows ?? []);
const hasMore = computed(() => requests.value.length < (list.data.value?.total ?? 0));

const activeRequest = computed<TradingAccountRequest | null>(
  () => requests.value.find((r) => r.id === selectedId.value) ?? null,
);

watch(view, () => (selectedId.value = null));
watch(requests, (rows) => {
  if (selectedId.value === null && rows.length) selectedId.value = rows[0].id;
});

function select(request: TradingAccountRequest) {
  selectedId.value = request.id;
}

function move(delta: number) {
  const i = requests.value.findIndex((r) => r.id === selectedId.value);
  const next = requests.value[Math.max(0, Math.min(requests.value.length - 1, i + delta))];
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

const newOpen = ref(false);
function onChanged() {
  list.refetch();
}
</script>

<template>
  <AppLayout>
    <div class="flex h-[calc(100dvh-3.5rem)] flex-col">
      <header class="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div class="flex items-center gap-2.5">
          <Inbox class="size-5 text-primary" />
          <div>
            <h1 class="text-lg font-semibold tracking-tight text-fg">Open-Account Requests</h1>
            <p class="text-xs text-muted">Approval queue · <kbd class="font-mono">j</kbd>/<kbd class="font-mono">k</kbd> to navigate</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <Link href="/trading/accounts">
            <Button variant="outline" size="sm"><LayoutList class="size-4" /> Accounts</Button>
          </Link>
          <Button v-if="auth.can('trading.requests.create')" size="sm" @click="newOpen = true">
            <Plus class="size-4" /> New request
          </Button>
        </div>
      </header>

      <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
        <!-- LEFT: queue -->
        <div class="h-72 shrink-0 border-b border-border lg:h-auto lg:w-80 lg:border-b-0 lg:border-e">
          <RequestQueue
            :requests="requests"
            :loading="list.isLoading.value"
            :view="view"
            :selected-id="selectedId"
            :has-more="hasMore"
            @update:view="view = $event"
            @select="select"
            @load-more="pageSize += 25"
          />
        </div>

        <!-- RIGHT: review pane -->
        <div class="min-h-0 flex-1">
          <RequestReviewPanel
            v-if="selectedId"
            :key="selectedId"
            :request-id="selectedId"
            :fallback="activeRequest"
            @changed="onChanged"
          />
          <div v-else class="flex h-full items-center justify-center text-sm text-muted">
            Select a request to review.
          </div>
        </div>
      </div>
    </div>

    <NewAccountDrawer :open="newOpen" @update:open="newOpen = $event" @created="onChanged" />
  </AppLayout>
</template>

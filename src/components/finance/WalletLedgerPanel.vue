<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useInfiniteScroll } from '@vueuse/core';
import LedgerEntriesPanel from './LedgerEntriesPanel.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useWalletLedger } from '@/queries/finance';
import { useAccumulatedRows } from '@/composables/useAccumulatedRows';
import type { LedgerEntry } from '@/types/finance';

/* Infinite wallet ledger — the immutable per-wallet money record. Pages
 * accumulate on scroll; entries are de-duped on append. */
const props = defineProps<{ walletId: number }>();

const page = ref(1);
const q = useWalletLedger(() => props.walletId, page);
const all = useAccumulatedRows<LedgerEntry>(
  () => props.walletId,
  page,
  () => q.data.value,
);
const lastPage = computed(() => q.data.value?.last_page ?? 1);

const scroller = useTemplateRef<HTMLElement>('scroller');
useInfiniteScroll(
  scroller,
  () => {
    if (page.value < lastPage.value && !q.isFetching.value) page.value += 1;
  },
  { distance: 80 },
);
</script>

<template>
  <div ref="scroller" class="max-h-[70vh] overflow-y-auto">
    <LedgerEntriesPanel :entries="all" :loading="q.isLoading.value && !all.length" />
    <div v-if="q.isFetching.value && all.length" class="flex justify-center py-3">
      <Spinner />
    </div>
  </div>
</template>

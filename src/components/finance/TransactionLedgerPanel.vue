<script setup lang="ts">
import { computed } from 'vue';
import LedgerEntriesPanel from './LedgerEntriesPanel.vue';
import { useTransaction } from '@/queries/finance';

/* The Ledger Entries tab for one transaction — pulls the cached transaction
 * detail (which eager-loads its ledger entries) and renders them. */
const props = defineProps<{ transactionId: number }>();

const detail = useTransaction(() => props.transactionId);
const entries = computed(() => detail.data.value?.ledger_entries ?? []);
</script>

<template>
  <LedgerEntriesPanel :entries="entries" :loading="detail.isLoading.value" />
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import { Wallet as WalletIcon, Plus, ArrowLeftRight, Gift, Columns3 } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import FinanceMetricsCards from '@/components/finance/FinanceMetricsCards.vue';
import FinanceVisualizations from '@/components/finance/FinanceVisualizations.vue';
import { useAuthStore } from '@/stores/auth';

/* Finance dashboard — the operations launchpad. KPI row (Deposits/
 * Withdrawals Today, Net Flow, Pending, Wallet Balances) over the four
 * distribution visualizations, with quick-action drawers. All money is
 * integer minor units rendered via formatMoney. */
defineOptions({ layout: null });

const CreateTransactionDrawer = defineAsyncComponent(
  () => import('@/components/finance/CreateTransactionDrawer.vue'),
);
const TransferDrawer = defineAsyncComponent(
  () => import('@/components/finance/TransferDrawer.vue'),
);
const CreditDialog = defineAsyncComponent(
  () => import('@/components/finance/CreditDialog.vue'),
);

const auth = useAuthStore();
const createOpen = ref(false);
const transferOpen = ref(false);
const creditOpen = ref(false);

const canCreate = computed(
  () => auth.can('finance.deposits.create') || auth.can('finance.withdrawals.create'),
);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5">
          <WalletIcon class="size-5 text-primary" />
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-fg">Finance Dashboard</h1>
            <p class="text-sm text-muted">Today's money flow and operations overview.</p>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <Link href="/finance/workspace">
            <Button variant="outline" size="sm"><Columns3 class="size-4" /> Workspace</Button>
          </Link>
          <Button v-if="auth.can('finance.credit.manage')" variant="outline" size="sm" @click="creditOpen = true">
            <Gift class="size-4" /> Credit
          </Button>
          <Button v-if="auth.can('finance.transfers.create')" variant="outline" size="sm" @click="transferOpen = true">
            <ArrowLeftRight class="size-4" /> Transfer
          </Button>
          <Button v-if="canCreate" size="sm" @click="createOpen = true">
            <Plus class="size-4" /> New transaction
          </Button>
        </div>
      </header>

      <FinanceMetricsCards />

      <FinanceVisualizations />
    </div>

    <CreateTransactionDrawer :open="createOpen" @update:open="createOpen = $event" />
    <TransferDrawer :open="transferOpen" @update:open="transferOpen = $event" />
    <CreditDialog :open="creditOpen" :client-id="null" @update:open="creditOpen = $event" />
  </AppLayout>
</template>

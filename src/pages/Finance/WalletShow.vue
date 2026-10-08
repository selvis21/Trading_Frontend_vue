<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue';
import { Link } from '@inertiajs/vue3';
import { ArrowLeft, CircleUserRound, Gift, ArrowLeftRight } from '@lucide/vue';
import AppLayout from '@/layouts/AppLayout.vue';
import Button from '@/components/ui/Button.vue';
import WalletCard from '@/components/finance/WalletCard.vue';
import WalletLedgerPanel from '@/components/finance/WalletLedgerPanel.vue';
import Spinner from '@/components/ui/Spinner.vue';
import { useAuthStore } from '@/stores/auth';
import { useWallet } from '@/queries/finance';

/* Wallet detail — balance breakdown (cash vs credit), freeze status +
 * action, and the immutable wallet ledger. Credit/transfer drawers are
 * lazy-loaded. `walletId` comes from the route. */
defineOptions({ layout: null });

const props = defineProps<{ walletId: number }>();

const CreditDialog = defineAsyncComponent(
  () => import('@/components/finance/CreditDialog.vue'),
);
const TransferDrawer = defineAsyncComponent(
  () => import('@/components/finance/TransferDrawer.vue'),
);

const auth = useAuthStore();
const wallet = useWallet(() => props.walletId);
const clientId = computed(() => wallet.data.value?.client_id ?? null);

const creditOpen = ref(false);
const transferOpen = ref(false);
</script>

<template>
  <AppLayout>
    <div class="mx-auto max-w-4xl p-4 sm:p-6">
      <Link href="/finance/transactions" class="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft class="size-4" /> Back to transactions
      </Link>

      <div v-if="wallet.isLoading.value && !wallet.data.value" class="flex h-64 items-center justify-center">
        <Spinner label="Loading wallet…" />
      </div>

      <template v-else-if="wallet.data.value">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            v-if="clientId"
            :href="`/clients/${clientId}`"
            class="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
          >
            <CircleUserRound class="size-4" /> Client #{{ clientId }}
          </Link>
          <div class="flex items-center gap-2">
            <Button v-if="auth.can('finance.credit.manage')" variant="outline" size="sm" @click="creditOpen = true">
              <Gift class="size-4" /> Credit
            </Button>
            <Button v-if="auth.can('finance.transfers.create')" variant="outline" size="sm" @click="transferOpen = true">
              <ArrowLeftRight class="size-4" /> Transfer
            </Button>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-[20rem_1fr]">
          <WalletCard :wallet="wallet.data.value" :link="false" @changed="wallet.refetch()" />

          <section class="rounded-lg border border-border bg-surface p-4">
            <h2 class="mb-3 text-sm font-semibold text-fg">Wallet ledger</h2>
            <WalletLedgerPanel :wallet-id="walletId" />
          </section>
        </div>
      </template>
    </div>

    <CreditDialog
      :open="creditOpen"
      :client-id="clientId"
      :currency-id="wallet.data.value?.currency_id"
      @update:open="creditOpen = $event"
      @done="wallet.refetch()"
    />
    <TransferDrawer
      :open="transferOpen"
      :client-id="clientId"
      @update:open="transferOpen = $event"
      @done="wallet.refetch()"
    />
  </AppLayout>
</template>

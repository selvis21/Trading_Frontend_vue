<script setup lang="ts">
import { computed, type Component } from 'vue';
import { Link } from '@inertiajs/vue3';
import {
  UserPlus,
  ShieldCheck,
  LineChart,
  ArrowDownToLine,
  Search,
  Command,
} from '@lucide/vue';
import WidgetCard from './WidgetCard.vue';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';

/* Permission-aware quick navigation. Hidden actions never render; the
 * command palette is always available. */
const auth = useAuthStore();
const ui = useUiStore();

interface QuickAction {
  label: string;
  href?: string;
  icon: Component;
  anyOf?: string[];
  onClick?: () => void;
}

const actions = computed<QuickAction[]>(() =>
  [
    { label: 'New lead', href: '/leads/inbox', icon: UserPlus, anyOf: ['leads.create'] },
    { label: 'KYC queue', href: '/compliance/queue', icon: ShieldCheck, anyOf: ['compliance.view'] },
    { label: 'Trading requests', href: '/trading/requests', icon: LineChart, anyOf: ['trading.view'] },
    { label: 'Deposits', href: '/finance/deposits', icon: ArrowDownToLine, anyOf: ['finance.view'] },
    { label: 'Find client', href: '/clients', icon: Search, anyOf: ['leads.view', 'compliance.view', 'finance.view', 'trading.view'] },
  ].filter((a) => !a.anyOf || auth.canAny(a.anyOf)),
);
</script>

<template>
  <WidgetCard title="Quick actions" :icon="Command">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <Link
        v-for="action in actions"
        :key="action.label"
        :href="action.href!"
        class="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface-sunken p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
      >
        <component :is="action.icon" class="size-5 text-primary" />
        <span class="text-xs font-medium text-fg">{{ action.label }}</span>
      </Link>

      <button
        class="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-3 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
        @click="ui.toggleCommand(true)"
      >
        <Command class="size-5 text-muted" />
        <span class="text-xs font-medium text-muted">Command (⌘K)</span>
      </button>
    </div>
  </WidgetCard>
</template>

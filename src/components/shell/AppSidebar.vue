<script setup lang="ts">
import { computed } from 'vue';
import { Link } from '@inertiajs/vue3';
import { PanelLeftClose, PanelLeftOpen } from '@lucide/vue';
import AppLogo from '@/components/shell/AppLogo.vue';
import SidebarNav from '@/components/navigation/SidebarNav.vue';
import Button from '@/components/ui/Button.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { BRAND_NAME } from '@/lib/brand';
import { cn } from '@/lib/utils';

const ui = useUiStore();
const auth = useAuthStore();
const collapsed = computed(() => ui.sidebarCollapsed);
</script>

<template>
  <aside
    :class="
      cn(
        'flex h-full flex-col border-e border-border bg-surface transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      )
    "
  >
    <!-- brand -->
    <div
      :class="
        cn(
          'flex flex-col border-b border-border',
          collapsed ? 'items-center py-3' : 'gap-1.5 px-4 py-3',
        )
      "
    >
      <Link
        href="/"
        :class="
          cn(
            'flex items-center rounded-md text-brand-ink-soft',
            collapsed ? 'justify-center' : 'gap-2.5',
          )
        "
        :aria-label="`${BRAND_NAME} home`"
      >
<!-- Expanded shows the official horizontal lockup; collapsed falls
back to the diamond mark isolated from that same asset. The link carries
aria-label, so no extra sr-only text is needed here. -->
        <AppLogo v-if="!collapsed" variant="full" :height="24" plate />
        <AppLogo v-else variant="mark" :height="24" plate />
      </Link>

      <span
        v-if="!collapsed"
        class="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
      >
        {{ BRAND_NAME }}
      </span>
    </div>

    <SidebarNav :collapsed="collapsed" />

    <!-- footer: role tier + collapse -->
    <div
      :class="
        cn(
          'flex items-center border-t border-border p-2',
          collapsed ? 'flex-col gap-2' : 'justify-between',
        )
      "
    >
      <span
        v-if="!collapsed && auth.user"
        class="truncate px-1.5 text-xs text-muted"
      >
        {{ auth.user.level_label ?? `Level ${auth.user.level}` }}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="ui.toggleSidebar()"
      >
        <PanelLeftOpen v-if="collapsed" />
        <PanelLeftClose v-else />
      </Button>
    </div>
  </aside>
</template>

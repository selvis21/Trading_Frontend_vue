<script setup lang="ts">
import { onMounted } from 'vue';
import AppSidebar from './AppSidebar.vue';
import AppTopbar from './AppTopbar.vue';
import CommandPalette from '@/components/command/CommandPalette.vue';
import NotificationCenter from '@/components/notifications/NotificationCenter.vue';
import GlobalLoadingBar from '@/components/feedback/GlobalLoadingBar.vue';
import Sheet from '@/components/ui/Sheet.vue';
import SidebarNav from '@/components/navigation/SidebarNav.vue';
import AppLogo from '@/components/shell/AppLogo.vue';
import ErrorBoundary from '@/components/feedback/ErrorBoundary.vue';
import { BRAND_NAME } from '@/lib/brand';
import { useUiStore } from '@/stores/ui';
import { useGlobalShortcuts } from '@/composables/useShortcuts';

/* The authenticated application shell: sidebar + topbar + content,
 * with global overlays (command palette, notifications, loading bar)
 * and the keyboard layer wired in once. */
const ui = useUiStore();
useGlobalShortcuts();

onMounted(() => ui.applyToDocument());
</script>

<template>
  <div class="flex h-dvh overflow-hidden bg-bg text-fg">
    <GlobalLoadingBar />

    <!-- desktop sidebar -->
    <div class="hidden lg:flex">
      <AppSidebar />
    </div>

    <!-- mobile sidebar (overlay) -->
    <Sheet
      side="left"
      :open="ui.sidebarMobileOpen"
      width="16rem"
      @update:open="ui.sidebarMobileOpen = $event"
    >
      <template #header>
        <div class="flex items-center gap-2.5">
          <AppLogo variant="full" :height="20" plate />
          <span
            class="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
          >
            {{ BRAND_NAME }}
          </span>
        </div>
      </template>
      <SidebarNav :collapsed="false" />
    </Sheet>

    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <main class="min-h-0 flex-1 overflow-y-auto">
        <ErrorBoundary>
          <slot />
        </ErrorBoundary>
      </main>
    </div>

    <CommandPalette />
    <NotificationCenter />
  </div>
</template>

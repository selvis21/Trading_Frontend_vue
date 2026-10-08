<script setup lang="ts">
import { computed } from 'vue';
import { router } from '@inertiajs/vue3';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from 'reka-ui';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Monitor,
  Menu,
  LogOut,
  User as UserIcon,
  Check,
} from '@lucide/vue';
import Kbd from '@/components/ui/Kbd.vue';
import Avatar from '@/components/ui/Avatar.vue';
import Button from '@/components/ui/Button.vue';
import { useUiStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useNotificationStore } from '@/stores/notifications';
import type { ThemeMode } from '@/types';

const ui = useUiStore();
const auth = useAuthStore();
const notifications = useNotificationStore();

const themeIcon = computed(() =>
  ui.theme === 'light' ? Sun : ui.theme === 'dark' ? Moon : Monitor,
);
const themes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

const menuContentClass =
  'z-50 min-w-48 rounded-md border border-border bg-surface-raised p-1 shadow-md data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95';
const menuItemClass =
  'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-fg outline-none transition-colors data-[highlighted]:bg-muted-surface';
</script>

<template>
  <header
    class="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-3 backdrop-blur sm:px-4"
  >
    <!-- mobile sidebar toggle -->
    <Button
      variant="ghost"
      size="icon-sm"
      class="lg:hidden"
      aria-label="Open menu"
      @click="ui.sidebarMobileOpen = true"
    >
      <Menu />
    </Button>

    <!-- command/search trigger -->
    <button
      data-global-search
      class="group flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 text-sm text-muted transition-colors hover:border-input hover:text-fg"
      @click="ui.toggleCommand(true)"
    >
      <Search class="size-4" />
      <span>Search clients, accounts, actions…</span>
      <span class="ms-auto hidden items-center gap-1 sm:flex">
        <Kbd>⌘</Kbd><Kbd>K</Kbd>
      </span>
    </button>

    <div class="ms-auto flex items-center gap-1">
      <!-- theme -->
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" size="icon-sm" aria-label="Theme">
            <component :is="themeIcon" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent :side-offset="6" align="end" :class="menuContentClass">
            <DropdownMenuItem
              v-for="t in themes"
              :key="t.value"
              :class="menuItemClass"
              @click="ui.setTheme(t.value)"
            >
              <component :is="t.icon" class="size-4" />
              {{ t.label }}
              <Check
                v-if="ui.theme === t.value"
                class="ms-auto size-4 text-primary"
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>

      <!-- notifications -->
      <Button
        variant="ghost"
        size="icon-sm"
        class="relative"
        aria-label="Notifications"
        @click="notifications.togglePanel()"
      >
        <Bell />
        <span
          v-if="notifications.hasUnread"
          class="absolute end-1.5 top-1.5 flex size-2 items-center justify-center"
        >
          <span
            class="absolute inline-flex size-full animate-ping rounded-full bg-status-danger/70"
          />
          <span class="relative inline-flex size-2 rounded-full bg-status-danger" />
        </span>
      </Button>

      <!-- avatar menu -->
      <DropdownMenuRoot>
        <DropdownMenuTrigger as-child>
          <button
            class="ms-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Account menu"
          >
            <Avatar
              :name="auth.user?.name"
              :src="auth.user?.avatar_path"
              size="sm"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent :side-offset="6" align="end" :class="menuContentClass">
            <DropdownMenuLabel class="px-2 py-1.5">
              <p class="truncate text-sm font-medium text-fg">
                {{ auth.user?.name }}
              </p>
              <p class="truncate text-xs text-muted">{{ auth.user?.email }}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <DropdownMenuItem
              :class="menuItemClass"
              @click="router.visit('/settings/profile')"
            >
              <UserIcon class="size-4" /> Profile & preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator class="my-1 h-px bg-border" />
            <DropdownMenuItem
              :class="menuItemClass"
              class="text-status-danger data-[highlighted]:bg-status-danger/10"
              @click="auth.logout()"
            >
              <LogOut class="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenuRoot>
    </div>
  </header>
</template>

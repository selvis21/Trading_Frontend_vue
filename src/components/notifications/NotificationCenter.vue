<script setup lang="ts">
import { router } from '@inertiajs/vue3';
import { BellOff, CheckCheck } from '@lucide/vue';
import Sheet from '@/components/ui/Sheet.vue';
import Button from '@/components/ui/Button.vue';
import EmptyState from '@/components/feedback/EmptyState.vue';
import { cn, timeAgo } from '@/lib/utils';
import { useNotificationStore } from '@/stores/notifications';

const notifications = useNotificationStore();

const toneBar: Record<string, string> = {
  neutral: 'bg-status-neutral',
  info: 'bg-status-info',
  warning: 'bg-status-warning',
  success: 'bg-status-success',
  danger: 'bg-status-danger',
  accent: 'bg-status-accent',
};

function open(id: string, href?: string) {
  notifications.markRead(id);
  if (href) {
    notifications.togglePanel(false);
    router.visit(href);
  }
}
</script>

<template>
  <Sheet
    :open="notifications.panelOpen"
    side="right"
    width="24rem"
    @update:open="notifications.togglePanel($event)"
  >
    <template #header>
      <div class="flex w-full items-center justify-between">
        <div>
          <h2 class="text-sm font-semibold text-fg">Notifications</h2>
          <p class="text-xs text-muted">
            {{ notifications.unreadCount }} unread
          </p>
        </div>
        <Button
          v-if="notifications.hasUnread"
          variant="ghost"
          size="sm"
          @click="notifications.markAllRead()"
        >
          <CheckCheck class="size-4" /> Mark all read
        </Button>
      </div>
    </template>

    <EmptyState
      v-if="!notifications.items.length"
      :icon="BellOff"
      title="You're all caught up"
      description="Mentions, approvals and system alerts will land here."
    />
    <ul v-else class="-mx-2 space-y-0.5">
      <li v-for="n in notifications.items" :key="n.id">
        <button
          :class="
            cn(
              'flex w-full gap-3 rounded-md px-2 py-2.5 text-start transition-colors hover:bg-muted-surface',
              !n.read && 'bg-primary/[0.04]',
            )
          "
          @click="open(n.id, n.href)"
        >
          <span
            :class="cn('mt-1 h-full w-0.5 shrink-0 rounded-full', toneBar[n.tone])"
          />
          <span class="min-w-0 flex-1">
            <span class="flex items-center gap-2">
              <span class="truncate text-sm font-medium text-fg">{{
                n.title
              }}</span>
              <span
                v-if="!n.read"
                class="ms-auto size-1.5 shrink-0 rounded-full bg-primary"
              />
            </span>
            <span v-if="n.body" class="mt-0.5 block text-xs text-muted">{{
              n.body
            }}</span>
            <span class="mt-1 block text-[11px] text-muted">{{
              timeAgo(n.createdAt)
            }}</span>
          </span>
        </button>
      </li>
    </ul>
  </Sheet>
</template>

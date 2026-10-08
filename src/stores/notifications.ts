import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useStorage } from '@vueuse/core';
import type { AppNotification } from '@/types';

/* Notification categories the user can independently tune. The backend
 * does not yet model these, so preferences are client-only (localStorage)
 * until a delivery-preferences endpoint exists. */
export type NotificationCategory =
  | 'mentions'
  | 'approvals'
  | 'assignments'
  | 'system';

export interface CategoryPref {
  /** Show transient toasts for this category. */
  toast: boolean;
  /** Surface in the bell / notification center. */
  bell: boolean;
}

const DEFAULT_PREFS: Record<NotificationCategory, CategoryPref> = {
  mentions: { toast: true, bell: true },
  approvals: { toast: true, bell: true },
  assignments: { toast: false, bell: true },
  system: { toast: false, bell: true },
};

/* ------------------------------------------------------------------ *
 * Notification store — the bell/center model. In Sprint 1 it is fed
 * by local pushes + seed data; the realtime channel (Reverb) will
 * prepend events here in a later sprint without UI changes.
 * ------------------------------------------------------------------ */
export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const panelOpen = ref(false);
  const preferences = useStorage<Record<NotificationCategory, CategoryPref>>(
    'crm.notification.prefs',
    structuredClone(DEFAULT_PREFS),
    localStorage,
    { mergeDefaults: true },
  );

  const unreadCount = computed(() => items.value.filter((n) => !n.read).length);
  const hasUnread = computed(() => unreadCount.value > 0);

  function setPref(
    category: NotificationCategory,
    channel: keyof CategoryPref,
    value: boolean,
  ): void {
    preferences.value[category][channel] = value;
  }
  function resetPrefs(): void {
    preferences.value = structuredClone(DEFAULT_PREFS);
  }

  function prepend(n: AppNotification): void {
    items.value.unshift(n);
  }
  function markRead(id: string): void {
    const n = items.value.find((i) => i.id === id);
    if (n) n.read = true;
  }
  function markAllRead(): void {
    items.value.forEach((n) => (n.read = true));
  }
  function remove(id: string): void {
    items.value = items.value.filter((i) => i.id !== id);
  }
  function clear(): void {
    items.value = [];
  }
  function setAll(next: AppNotification[]): void {
    items.value = next;
  }
  function togglePanel(open?: boolean): void {
    panelOpen.value = open ?? !panelOpen.value;
  }

  return {
    items,
    panelOpen,
    preferences,
    setPref,
    resetPrefs,
    unreadCount,
    hasUnread,
    prepend,
    markRead,
    markAllRead,
    remove,
    clear,
    setAll,
    togglePanel,
  };
});

import { onKeyStroke, useMagicKeys, whenever } from '@vueuse/core';
import { router } from '@inertiajs/vue3';
import { useUiStore } from '@/stores/ui';
import { useNotificationStore } from '@/stores/notifications';

/* ------------------------------------------------------------------ *
 * Global keyboard layer (Linear-grade). ⌘K / Ctrl+K opens the command
 * palette; `g` then a letter jumps between modules; `?` toggles help.
 * Shortcuts suspend while the user is typing in a field.
 * ------------------------------------------------------------------ */
function isEditingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    node.isContentEditable
  );
}

export function useGlobalShortcuts() {
  const ui = useUiStore();
  const notifications = useNotificationStore();
  const keys = useMagicKeys({
    passive: false,
    onEventFired(e) {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
      }
    },
  });

  // ⌘K / Ctrl+K → command palette
  whenever(keys['Meta+K'], () => ui.toggleCommand(true));
  whenever(keys['Ctrl+K'], () => ui.toggleCommand(true));

  // `g` then a letter → go to module (chord)
  let awaitingGoto = false;
  let gotoTimer: ReturnType<typeof setTimeout> | null = null;
  const routes: Record<string, string> = {
    h: '/',
    l: '/leads',
    c: '/clients',
    t: '/trading/accounts',
    f: '/finance/transactions',
    k: '/compliance/queue',
    r: '/reports',
  };

  onKeyStroke(true, (e) => {
    if (isEditingTarget(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (awaitingGoto) {
      const dest = routes[e.key.toLowerCase()];
      awaitingGoto = false;
      if (gotoTimer) clearTimeout(gotoTimer);
      if (dest) {
        e.preventDefault();
        router.visit(dest);
      }
      return;
    }

    if (e.key === 'g') {
      awaitingGoto = true;
      gotoTimer = setTimeout(() => (awaitingGoto = false), 1200);
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      const search = document.querySelector<HTMLInputElement>(
        '[data-global-search]',
      );
      search?.focus();
    }
    if (e.key.toLowerCase() === 'n' && e.shiftKey) {
      notifications.togglePanel();
    }
  });
}

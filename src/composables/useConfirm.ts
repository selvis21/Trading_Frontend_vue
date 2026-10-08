import { reactive, readonly } from 'vue';
import type { StatusTone } from '@/types';

/* ------------------------------------------------------------------ *
 * Programmatic confirmation. A single <ConfirmDialog/> is mounted in
 * the app root; `confirm(...)` returns a promise resolving to the
 * user's choice. Supports an optional "type to confirm" challenge for
 * high-stakes (money / destructive) actions.
 * ------------------------------------------------------------------ */
export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: StatusTone;
  /** When set, the confirm button stays disabled until the user types this. */
  challenge?: string;
  challengeLabel?: string;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolver: ((value: boolean) => void) | null;
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  resolver: null,
  tone: 'danger',
});

export function useConfirm() {
  function confirm(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      Object.assign(state, options, { open: true, resolver: resolve });
    });
  }

  function resolve(value: boolean): void {
    state.open = false;
    state.resolver?.(value);
    state.resolver = null;
  }

  return { confirm, resolve, state: readonly(state) };
}

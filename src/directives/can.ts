import type { Directive } from 'vue';
import { useAuthStore } from '@/stores/auth';

/* ------------------------------------------------------------------ *
 * v-can — permission-aware rendering. Removes (comments out) the
 * element when the user lacks the permission(s). Mirrors the server
 * gate; the API still enforces. Usage:
 *   v-can="'finance.approve'"            (single)
 *   v-can:any="['a','b']"                (any of)
 *   v-can:all="['a','b']"                (all of)
 * ------------------------------------------------------------------ */
function allowed(value: string | string[], arg?: string): boolean {
  const auth = useAuthStore();
  const list = Array.isArray(value) ? value : [value];
  if (arg === 'all') return auth.canAll(list);
  if (arg === 'any') return auth.canAny(list);
  return auth.canAny(list);
}

const placeholders = new WeakMap<HTMLElement, Comment>();

export const vCan: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    if (!allowed(binding.value, binding.arg)) {
      const placeholder = document.createComment('v-can');
      placeholders.set(el, placeholder);
      el.replaceWith(placeholder);
    }
  },
};

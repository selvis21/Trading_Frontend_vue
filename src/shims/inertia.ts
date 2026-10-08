import {
  defineComponent,
  h,
  reactive,
  type PropType,
  type VNode,
} from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { router as appRouter } from '@/router';

/* ------------------------------------------------------------------ *
 * Inertia → Vue Router compatibility shim.
 *
 * The app was extracted from a Laravel/Inertia SPA. Rather than rewrite
 * ~50 components' navigation calls, we alias `@inertiajs/vue3` to this
 * module (see vite.config.ts + tsconfig paths). It re-implements the
 * thin slice of the Inertia surface the app actually used — `Link`,
 * `router`, and `usePage` — on top of Vue Router. Inertia itself is no
 * longer a dependency; all navigation is real client-side routing.
 *
 * Migration note: call sites can be progressively codemodded to native
 * `<RouterLink :to>` / `useRouter()` / `useRoute()` and this shim deleted
 * — nothing here changes behaviour, it only preserves the old import API.
 * ------------------------------------------------------------------ */

/** Inertia's <Link href> → Vue Router's <RouterLink to>. */
export const Link = defineComponent({
  name: 'Link',
  inheritAttrs: false,
  props: {
    href: { type: String as PropType<string>, default: '/' },
    replace: { type: Boolean, default: false },
    // Accepted for source-compatibility; Vue Router handles these natively
    // or they are no-ops for our (GET-only) usage.
    as: { type: String, default: 'a' },
    method: { type: String, default: 'get' },
    preserveScroll: { type: Boolean, default: false },
    preserveState: { type: Boolean, default: false },
  },
  setup(props, { slots, attrs }) {
    return (): VNode =>
      h(
        RouterLink,
        { to: props.href || '/', replace: props.replace, ...attrs },
        slots.default ? { default: () => slots.default!() } : undefined,
      );
  },
});

/* ------------------------------------------------------------------ *
 * Imperative navigation. Inertia's `router.visit(url)` and friends map
 * onto the Vue Router instance. Works inside and outside component setup
 * (the auth store and composables call these), because it uses the
 * singleton router instance rather than `useRouter()`.
 * ------------------------------------------------------------------ */
type VisitOptions = { replace?: boolean } & Record<string, unknown>;

export const router = {
  visit(url: string, options: VisitOptions = {}): void {
    if (options.replace) void appRouter.replace(url);
    else void appRouter.push(url);
  },
  get(url: string): void {
    void appRouter.push(url);
  },
  post(url: string): void {
    void appRouter.push(url);
  },
  put(url: string): void {
    void appRouter.push(url);
  },
  patch(url: string): void {
    void appRouter.push(url);
  },
  delete(url: string): void {
    void appRouter.push(url);
  },
  replace(url: string): void {
    void appRouter.replace(url);
  },
  reload(): void {
    void appRouter.go(0);
  },
  on(): () => void {
    return () => {};
  },
};

/* ------------------------------------------------------------------ *
 * usePage() — the app only reads `.url` (for active-link highlighting).
 * We expose a reactive object whose `url` getter tracks the current
 * route, so existing `computed(() => page.url.split('?')[0])` stays
 * reactive. Must be called within component setup (it uses useRoute()).
 * ------------------------------------------------------------------ */
export function usePage() {
  const route = useRoute();
  return reactive({
    get url(): string {
      return route.fullPath;
    },
    get component(): string {
      return (route.name as string) ?? '';
    },
    props: {} as Record<string, unknown>,
    version: null as string | null,
  });
}

/* ------------------------------------------------------------------ *
 * Module augmentation for vue-router.
 *
 * `permission` mirrors the API's own feature-axis gate: a route carrying it
 * is only reachable by a session holding at least one of the listed
 * permissions. The server still enforces every action — this keeps a direct
 * URL or stale bookmark from rendering a page whose queries are all disabled
 * (which read as a misleading "no records" empty state).
 * ------------------------------------------------------------------ */
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** Any-of permission list required to enter the route. */
    permission?: string[];
  }
}

export {};

import { computed } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type { MePayload } from '@/types';

/* ------------------------------------------------------------------ *
 * Auth/session query layer.
 *
 * `useMeQuery` is the single hydration path for the session: it fetches
 * GET /auth/me, mirrors the result into the auth store (the capability
 * gate), and is keyed so any mutation that changes the actor's roles or
 * permissions can `invalidateQueries({ queryKey: queryKeys.me })` to
 * re-hydrate the whole app consistently.
 * ------------------------------------------------------------------ */
export function fetchMe(): Promise<MePayload> {
  return api.get<MePayload>('/auth/me');
}

export function useMeQuery() {
  const auth = useAuthStore();

  const query = useQuery({
    queryKey: queryKeys.me,
    // Shares the store's single-flight /auth/me with the router guard, which
    // hydrates first on a hard load; avoids a duplicate call per page load.
    queryFn: () => auth.loadMe(),
    enabled: computed(() => !!auth.token),
    staleTime: 5 * 60_000,
    retry: false,
  });

  // The session is "settled" when there is no token (anonymous) or the
  // me-query has resolved/failed at least once.
  const settled = computed(
    () => !auth.token || query.isFetched.value,
  );

  return { ...query, settled };
}

/** Imperatively re-hydrate the session (e.g. after a role change). */
export function useRefreshSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: queryKeys.me });
}

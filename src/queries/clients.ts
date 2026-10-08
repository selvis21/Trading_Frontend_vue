import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type { Paginated } from '@/types';
import type { Client } from '@/types/sales';

/* ------------------------------------------------------------------ *
 * Client directory + creation.
 *
 * The client-first account workflow lets an operator search the directory
 * by the identifiers they actually know (name / email / mobile / client
 * code) and register a contact-only client inline. Both reuse the existing
 * Sales API — no duplicate client endpoints.
 * ------------------------------------------------------------------ */

/**
 * Server-side client search. `enabled` lets callers skip fetching until the
 * operator has actually typed (never bulk-load the directory).
 */
export function useClientsList(
  params: MaybeRefOrGetter<Record<string, unknown>>,
  enabled: MaybeRefOrGetter<boolean> = () => true,
) {
  const auth = useAuthStore();
  const ready = computed(() => toValue(enabled));
  return useQuery({
    queryKey: computed(() => queryKeys.clients.list(toValue(params))),
    enabled: computed(() => auth.can('leads.view') && ready.value),
    staleTime: 15_000,
    queryFn: () => api.get<Paginated<Client>>('/clients', toValue(params)),
  });
}

/** Single client detail (used when a workflow is locked to one client). */
export function useClientDetail(id: MaybeRefOrGetter<number | null>) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.clients.detail(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id) && auth.can('leads.view')),
    staleTime: 30_000,
    queryFn: () => api.get<Client>(`/clients/${toValue(id)}`),
  });
}

/**
 * Register a contact-only client (no originating lead). Mirrors the backend
 * StoreClientRequest rules: a name plus an email or mobile.
 */
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post<Client>('/clients', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

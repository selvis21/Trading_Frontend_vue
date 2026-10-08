import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type { Paginated } from '@/types';
import type { ApplicationRecord, ApplicationSubmission } from '@/types/applications';

/* ------------------------------------------------------------------ *
 * Applications (Demo + Live) query + mutation layer.
 *
 * Submissions run through POST /applications — the CRM-authenticated
 * wrapper around the SAME intake service the public Website uses — so the
 * SPA reproduces the website flows without a second business path. Success
 * refreshes the client's lifecycle read-model and the open-account request
 * queue (a submission IS a trading-account request row), keeping the
 * Requests screen and drawer lifecycle honest.
 * ------------------------------------------------------------------ */

export function useSubmitApplication() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      api.post<ApplicationSubmission>('/applications', payload),
    onSuccess: (result) => {
      // The submission is a trading-account request + (sometimes) a new
      // client: refresh the lifecycle read-model and every request list.
      qc.invalidateQueries({ queryKey: ['trading', 'lifecycle'] });
      qc.invalidateQueries({ queryKey: ['trading', 'requests'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      if (result.client?.id) {
        qc.invalidateQueries({
          queryKey: queryKeys.trading.lifecycle(result.client.id),
        });
      }
    },
  });
}

/** Status view for a reference (the same payload the public endpoint returns). */
export function useApplicationByReference(reference: string | null) {
  return useQuery({
    queryKey: computed(() => queryKeys.applications.detail(reference ?? '')),
    enabled: !!reference,
    staleTime: 10_000,
    queryFn: () =>
      api.get<ApplicationSubmission>(`/applications/${encodeURIComponent(reference ?? '')}`),
  });
}

/** The canonical Application list (Demo + Live), optionally scoped by client. */
export function useApplicationsList(
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  const auth = useAuthStore();
  return useQuery({
    queryKey: computed(() => queryKeys.applications.list(toValue(params))),
    enabled: computed(() => auth.can('trading.view')),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () => api.get<Paginated<ApplicationRecord>>('/applications', toValue(params)),
  });
}

/** The full Application Details record, keyed by the APP… reference (or id). */
export function useApplicationDetail(reference: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => ['applications', 'record', toValue(reference) ?? '']),
    enabled: computed(() => !!toValue(reference)),
    staleTime: 20_000,
    queryFn: () =>
      api.get<ApplicationRecord>(
        `/applications/${encodeURIComponent(toValue(reference) ?? '')}/detail`,
      ),
  });
}

/**
 * Approve / reject a pending application. Approval is gated server-side on the
 * client's KYC (live/IB); the API rejects it even if the SPA lets it through,
 * so the UI mirrors `can_approve` / `approval_blocked_reason` from the record.
 */
export function useApplicationDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: number;
      action: 'approve' | 'reject';
      reason?: string;
    }) =>
      api.post(
        `/trading-account-requests/${id}/${action}`,
        action === 'reject' ? { reason } : undefined,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['trading', 'requests'] });
    },
  });
}

import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type { Paginated } from '@/types';
import type {
  TradingAccount,
  TradingAccountRequest,
  TradingAccountStatusHistory,
  TradingActivity,
  TradingGroup,
  TradingLifecycle,
  TradingMetrics,
  TradingPlatform,
} from '@/types/trading';

/* ------------------------------------------------------------------ *
 * Trading / accounts query + mutation layer. Reads are gated behind
 * trading.view; lifecycle actions behind their granular permissions
 * (the server enforces — this only mirrors affordances). Detail, history
 * and platform/group reference queries are cached; the account activity
 * timeline loads infinitely. Mutations invalidate the precise affected
 * keys so two operators on the same queue stay consistent.
 * ------------------------------------------------------------------ */
function gate(perm: string) {
  const auth = useAuthStore();
  return computed(() => auth.can(perm));
}

/** Imperative permission check (for use inside computed/query fns). */
function authCan(perm: string): boolean {
  return useAuthStore().can(perm);
}

/* ------------------------------- reads ------------------------------- */

export function useTradingMetrics() {
  return useQuery({
    queryKey: queryKeys.trading.metrics,
    enabled: gate('trading.view'),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () => api.get<TradingMetrics>('/trading/metrics'),
  });
}

export function useTradingAccounts(
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.accounts(toValue(params))),
    enabled: gate('trading.view'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () =>
      api.get<Paginated<TradingAccount>>('/trading-accounts', toValue(params)),
  });
}

export function useTradingAccount(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.account(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () => api.get<TradingAccount>(`/trading-accounts/${toValue(id)}`),
  });
}

export function useTradingAccountHistory(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.accountHistory(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () =>
      api.get<TradingAccountStatusHistory[]>(
        `/trading-accounts/${toValue(id)}/history`,
      ),
  });
}

export function useTradingAccountTimeline(
  id: MaybeRefOrGetter<number | null>,
  page: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.trading.accountTimeline(toValue(id) ?? 0),
      toValue(page),
    ]),
    enabled: computed(() => !!toValue(id)),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<Paginated<TradingActivity>>(
        `/trading-accounts/${toValue(id)}/timeline`,
        { page: toValue(page), page_size: 25 },
      ),
  });
}

export function useTradingRequests(
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.requests(toValue(params))),
    enabled: gate('trading.view'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () =>
      api.get<Paginated<TradingAccountRequest>>(
        '/trading-account-requests',
        toValue(params),
      ),
  });
}

export function useTradingRequest(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.request(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () =>
      api.get<TradingAccountRequest>(
        `/trading-account-requests/${toValue(id)}`,
      ),
  });
}

/**
 * The customer lifecycle read-model (stages + valid next actions). Derived
 * server-side from real records — the frontend only renders it.
 */
export function useTradingLifecycle(clientId: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.lifecycle(toValue(clientId) ?? 0)),
    enabled: computed(() => !!toValue(clientId) && authCan('trading.view')),
    staleTime: 10_000,
    queryFn: () =>
      api.get<TradingLifecycle>(
        `/clients/${toValue(clientId)}/trading-lifecycle`,
      ),
  });
}

/** Platforms (with their groups) — long-lived reference data.
 *
 * `required` defaults to `trading.view`, but callers that are allowed onto a
 * screen WITHOUT that permission (the Demo/Live Application forms are gated
 * on `trading.applications.*.create` only) must pass the permission that
 * actually guards them, or the picker silently loads nothing and the form
 * cannot be submitted. The endpoint itself needs no permission — reads are
 * open to any authenticated user.
 */
export function useTradingPlatforms(
  active = false,
  required: string | string[] = 'trading.view',
) {
  const auth = useAuthStore();
  const allowed = computed(() =>
    Array.isArray(required) ? auth.canAny(required) : auth.can(required),
  );

  return useQuery({
    queryKey: queryKeys.trading.platforms(active),
    enabled: allowed,
    staleTime: 10 * 60_000,
    queryFn: () =>
      api.get<TradingPlatform[]>(
        '/trading-platforms',
        active ? { active: true } : undefined,
      ),
  });
}

export function useTradingGroups(
  params: MaybeRefOrGetter<Record<string, unknown>> = () => ({}),
) {
  return useQuery({
    queryKey: computed(() => queryKeys.trading.groups(toValue(params))),
    enabled: gate('trading.view'),
    staleTime: 10 * 60_000,
    queryFn: () => api.get<TradingGroup[]>('/trading-groups', toValue(params)),
  });
}

/* ----------------------------- mutations ----------------------------- */
function useTradingInvalidate() {
  const qc = useQueryClient();
  return {
    qc,
    all: () => qc.invalidateQueries({ queryKey: ['trading'] }),
    /** Refresh a single account + every list/history/timeline + metrics. */
    account: (id: number) => {
      qc.invalidateQueries({ queryKey: queryKeys.trading.account(id) });
      qc.invalidateQueries({ queryKey: ['trading', 'accounts'] });
      qc.invalidateQueries({ queryKey: queryKeys.trading.accountHistory(id) });
      qc.invalidateQueries({ queryKey: queryKeys.trading.accountTimeline(id) });
      qc.invalidateQueries({ queryKey: queryKeys.trading.metrics });
    },
    requests: () => {
      qc.invalidateQueries({ queryKey: ['trading', 'requests'] });
      // The lifecycle read-model is derived from requests/accounts — refresh it
      // so the client-first drawer never shows a stale "pending" state.
      qc.invalidateQueries({ queryKey: ['trading', 'lifecycle'] });
      qc.invalidateQueries({ queryKey: queryKeys.trading.metrics });
    },
  };
}

/** Suspend an active account. Optional reason lands on the timeline. */
export function useSuspendAccount() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api.post<TradingAccount>(`/trading-accounts/${id}/suspend`, { reason }),
    onSuccess: (account, { id }) => {
      inv.qc.setQueryData(queryKeys.trading.account(id), account);
      inv.account(id);
    },
  });
}

/** Resume a suspended account back to active. */
export function useResumeAccount() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      api.post<TradingAccount>(`/trading-accounts/${id}/resume`),
    onSuccess: (account, { id }) => {
      inv.qc.setQueryData(queryKeys.trading.account(id), account);
      inv.account(id);
    },
  });
}

/** Close an account (terminal). Optional reason lands on the timeline. */
export function useCloseAccount() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      api.post<TradingAccount>(`/trading-accounts/${id}/close`, { reason }),
    onSuccess: (account, { id }) => {
      inv.qc.setQueryData(queryKeys.trading.account(id), account);
      inv.account(id);
    },
  });
}

/** Change leverage (1–5000) on an active/suspended account. */
export function useChangeLeverage() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id, leverage }: { id: number; leverage: number }) =>
      api.post<TradingAccount>(`/trading-accounts/${id}/leverage`, { leverage }),
    onSuccess: (account, { id }) => {
      inv.qc.setQueryData(queryKeys.trading.account(id), account);
      inv.account(id);
    },
  });
}

/** Approve an open-account request → provisions the account. */
export function useApproveRequest() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      api.post<TradingAccount>(`/trading-account-requests/${id}/approve`),
    onSuccess: () => {
      inv.requests();
      inv.qc.invalidateQueries({ queryKey: ['trading', 'accounts'] });
    },
  });
}

/** Reject an open-account request. Reason is mandatory. */
export function useRejectRequest() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      api.post<TradingAccountRequest>(
        `/trading-account-requests/${id}/reject`,
        { reason },
      ),
    onSuccess: (req, { id }) => {
      inv.qc.setQueryData(queryKeys.trading.request(id), req);
      inv.requests();
    },
  });
}

/** Cancel a still-pending request. */
export function useCancelRequest() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number }) =>
      api.post<TradingAccountRequest>(`/trading-account-requests/${id}/cancel`),
    onSuccess: (req, { id }) => {
      inv.qc.setQueryData(queryKeys.trading.request(id), req);
      inv.requests();
    },
  });
}

/** Submit an open-account request for a client (the creation workflow). */
export function useCreateAccountRequest() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number;
      payload: {
        trading_platform_id: number;
        trading_group_id?: number | null;
        currency_id?: number | null;
        account_type?: string;
        requested_leverage?: number | null;
      };
    }) =>
      api.post<TradingAccountRequest>(
        `/clients/${clientId}/trading-account-requests`,
        payload,
      ),
    onSuccess: () => inv.requests(),
  });
}

/** Directly create (provision) a trading account for a client, bypassing the
 * request/approval queue. Requires trading.accounts.create; the verified-KYC
 * business rule is enforced server-side in the service. */
export function useCreateAccount() {
  const inv = useTradingInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number;
      payload: {
        trading_platform_id: number;
        trading_group_id?: number | null;
        currency_id?: number | null;
        account_type?: string;
        leverage?: number | null;
        color?: string | null;
      };
    }) =>
      api.post<TradingAccount>(`/clients/${clientId}/trading-accounts`, payload),
    onSuccess: (account) => {
      inv.account(account.id);
    },
  });
}

/* ------------------------------------------------------------------ *
 * Platform & group administration (Sprint 9). Reference-data CRUD gated
 * behind trading.platforms.manage / trading.groups.manage. Writes
 * invalidate the platform/group reference caches (a platform embeds its
 * groups, so group writes also refresh platforms).
 * ------------------------------------------------------------------ */
function usePlatformInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['trading', 'platforms'] });
    qc.invalidateQueries({ queryKey: ['trading', 'groups'] });
  };
}

export function useCreatePlatform() {
  const inv = usePlatformInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<TradingPlatform>) =>
      api.post<TradingPlatform>('/trading-platforms', payload),
    onSuccess: inv,
  });
}

export function useUpdatePlatform() {
  const inv = usePlatformInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TradingPlatform> }) =>
      api.patch<TradingPlatform>(`/trading-platforms/${id}`, payload),
    onSuccess: inv,
  });
}

export function useDeletePlatform() {
  const inv = usePlatformInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/trading-platforms/${id}`),
    onSuccess: inv,
  });
}

export function useCreateGroup() {
  const inv = usePlatformInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<TradingGroup>) =>
      api.post<TradingGroup>('/trading-groups', payload),
    onSuccess: inv,
  });
}

export function useUpdateGroup() {
  const inv = usePlatformInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<TradingGroup> }) =>
      api.patch<TradingGroup>(`/trading-groups/${id}`, payload),
    onSuccess: inv,
  });
}

export function useDeleteGroup() {
  const inv = usePlatformInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/trading-groups/${id}`),
    onSuccess: inv,
  });
}

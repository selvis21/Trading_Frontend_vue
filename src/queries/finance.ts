import { computed, type MaybeRefOrGetter, toValue } from 'vue';
import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
  useQueries,
} from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/auth';
import type { Paginated } from '@/types';
import type {
  FinanceActivity,
  FinanceMetrics,
  FinanceNote,
  FinanceTransaction,
  FinanceTransactionStatusHistory,
  LedgerEntry,
  PaymentMethod,
  TransactionType,
  Wallet,
} from '@/types/finance';

/* ------------------------------------------------------------------ *
 * Finance query + mutation layer. Reads gated behind finance.view;
 * actions behind their granular permissions (the server enforces). All
 * money on the wire is integer minor units. Detail/wallet/ledger queries
 * are cached; the client finance timeline + wallet ledger load infinitely.
 * Mutations invalidate the precise affected keys so concurrent operators
 * on a queue stay consistent.
 * ------------------------------------------------------------------ */
function gate(perm: string) {
  const auth = useAuthStore();
  return computed(() => auth.can(perm));
}

/* ------------------------------- reads ------------------------------- */

export function useFinanceMetrics() {
  return useQuery({
    queryKey: queryKeys.finance.metrics,
    enabled: gate('finance.view'),
    staleTime: 60_000,
    refetchInterval: 60_000,
    queryFn: () => api.get<FinanceMetrics>('/finance/metrics'),
  });
}

export function useTransactions(
  params: MaybeRefOrGetter<Record<string, unknown>>,
) {
  return useQuery({
    queryKey: computed(() => queryKeys.finance.transactions(toValue(params))),
    enabled: gate('finance.view'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () =>
      api.get<Paginated<FinanceTransaction>>('/finance/transactions', toValue(params)),
  });
}

export function useTransaction(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.finance.transaction(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () =>
      api.get<FinanceTransaction>(`/finance/transactions/${toValue(id)}`),
  });
}

export function useTransactionHistory(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() =>
      queryKeys.finance.transactionHistory(toValue(id) ?? 0),
    ),
    enabled: computed(() => !!toValue(id)),
    staleTime: 20_000,
    queryFn: () =>
      api.get<FinanceTransactionStatusHistory[]>(
        `/finance/transactions/${toValue(id)}/history`,
      ),
  });
}

/** Per-client finance activity timeline (paginated → infinite-scrolled). */
export function useClientFinanceTimeline(
  clientId: MaybeRefOrGetter<number | null>,
  page: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.finance.clientTimeline(toValue(clientId) ?? 0),
      toValue(page),
    ]),
    enabled: computed(() => !!toValue(clientId)),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<Paginated<FinanceActivity>>(
        `/clients/${toValue(clientId)}/finance/timeline`,
        { page: toValue(page), page_size: 25 },
      ),
  });
}

export function useFinanceNotes(clientId: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.finance.clientNotes(toValue(clientId) ?? 0)),
    enabled: computed(() => !!toValue(clientId)),
    queryFn: () =>
      api.get<FinanceNote[]>(`/clients/${toValue(clientId)}/finance/notes`),
  });
}

export function useClientWallets(clientId: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.finance.clientWallets(toValue(clientId) ?? 0)),
    enabled: computed(() => !!toValue(clientId)),
    staleTime: 15_000,
    queryFn: () => api.get<Wallet[]>(`/clients/${toValue(clientId)}/wallets`),
  });
}

export function useWallet(id: MaybeRefOrGetter<number | null>) {
  return useQuery({
    queryKey: computed(() => queryKeys.finance.wallet(toValue(id) ?? 0)),
    enabled: computed(() => !!toValue(id)),
    staleTime: 15_000,
    queryFn: () => api.get<Wallet>(`/wallets/${toValue(id)}`),
  });
}

export function useWalletLedger(
  id: MaybeRefOrGetter<number | null>,
  page: MaybeRefOrGetter<number>,
) {
  return useQuery({
    queryKey: computed(() => [
      ...queryKeys.finance.walletLedger(toValue(id) ?? 0),
      toValue(page),
    ]),
    enabled: computed(() => !!toValue(id)),
    placeholderData: keepPreviousData,
    queryFn: () =>
      api.get<Paginated<LedgerEntry>>(`/wallets/${toValue(id)}/ledger`, {
        page: toValue(page),
        page_size: 50,
      }),
  });
}

export function useLedger(params: MaybeRefOrGetter<Record<string, unknown>>) {
  return useQuery({
    queryKey: computed(() => queryKeys.finance.ledger(toValue(params))),
    enabled: gate('finance.view'),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    queryFn: () => api.get<Paginated<LedgerEntry>>('/finance/ledger', toValue(params)),
  });
}

export function usePaymentMethods(active = false) {
  return useQuery({
    queryKey: queryKeys.finance.paymentMethods(active),
    enabled: gate('finance.view'),
    staleTime: 10 * 60_000,
    queryFn: () =>
      api.get<PaymentMethod[]>(
        '/payment-methods',
        active ? { active: true } : undefined,
      ),
  });
}

/**
 * Transaction count per type (deposit/withdrawal/transfer/credit), each a
 * page_size:1 list read returning only `total`. Powers the type/"wallet"
 * distribution chart without a dedicated backend rollup.
 */
const TYPE_KEYS: TransactionType[] = ['deposit', 'withdrawal', 'transfer', 'credit'];
export function useTransactionTypeCounts() {
  const auth = useAuthStore();
  const enabled = computed(() => auth.can('finance.view'));
  const results = useQueries({
    queries: TYPE_KEYS.map((t) => ({
      queryKey: [...queryKeys.finance.typeCounts, t] as const,
      enabled,
      staleTime: 60_000,
      queryFn: () =>
        api
          .get<Paginated<FinanceTransaction>>('/finance/transactions', {
            type: t,
            page_size: 1,
          })
          .then((p) => p.total),
    })),
  });
  const data = computed<Record<string, number>>(() => {
    const out: Record<string, number> = {};
    results.value.forEach((r, i) => {
      out[TYPE_KEYS[i]] = (r.data as number | undefined) ?? 0;
    });
    return out;
  });
  const isLoading = computed(() => results.value.some((r) => r.isLoading));
  return { data, isLoading };
}

/* ----------------------------- mutations ----------------------------- */
function useFinanceInvalidate() {
  const qc = useQueryClient();
  return {
    qc,
    transaction: (id: number, clientId?: number) => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.transaction(id) });
      qc.invalidateQueries({ queryKey: ['finance', 'transactions'] });
      qc.invalidateQueries({ queryKey: queryKeys.finance.transactionHistory(id) });
      qc.invalidateQueries({ queryKey: queryKeys.finance.metrics });
      qc.invalidateQueries({ queryKey: queryKeys.finance.ledger({}) });
      qc.invalidateQueries({ queryKey: ['finance', 'ledger'] });
      if (clientId) {
        qc.invalidateQueries({ queryKey: ['finance', 'client', clientId] });
      }
    },
    wallet: (id: number, clientId?: number) => {
      qc.invalidateQueries({ queryKey: queryKeys.finance.wallet(id) });
      qc.invalidateQueries({ queryKey: queryKeys.finance.walletLedger(id) });
      if (clientId) {
        qc.invalidateQueries({ queryKey: queryKeys.finance.clientWallets(clientId) });
        qc.invalidateQueries({ queryKey: ['finance', 'client', clientId] });
      }
    },
    all: () => qc.invalidateQueries({ queryKey: ['finance'] }),
  };
}

export function useApproveDeposit() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number; clientId?: number }) =>
      api.post<FinanceTransaction>(`/deposits/${id}/approve`),
    onSuccess: (txn, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.finance.transaction(id), txn);
      inv.transaction(id, clientId);
      if (txn.wallet_id) inv.wallet(txn.wallet_id, clientId);
    },
  });
}

export function useApproveWithdrawal() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number; clientId?: number }) =>
      api.post<FinanceTransaction>(`/withdrawals/${id}/approve`),
    onSuccess: (txn, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.finance.transaction(id), txn);
      inv.transaction(id, clientId);
      if (txn.wallet_id) inv.wallet(txn.wallet_id, clientId);
    },
  });
}

export function useRejectTransaction() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string; clientId?: number }) =>
      api.post<FinanceTransaction>(`/finance/transactions/${id}/reject`, { reason }),
    onSuccess: (txn, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.finance.transaction(id), txn);
      inv.transaction(id, clientId);
    },
  });
}

export function useCancelTransaction() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string; clientId?: number }) =>
      api.post<FinanceTransaction>(`/finance/transactions/${id}/cancel`, { reason }),
    onSuccess: (txn, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.finance.transaction(id), txn);
      inv.transaction(id, clientId);
    },
  });
}

export function useFreezeWallet() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number; clientId?: number }) =>
      api.post<Wallet>(`/wallets/${id}/freeze`),
    onSuccess: (wallet, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.finance.wallet(id), wallet);
      inv.wallet(id, clientId ?? wallet.client_id);
    },
  });
}

export function useUnfreezeWallet() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ id }: { id: number; clientId?: number }) =>
      api.post<Wallet>(`/wallets/${id}/unfreeze`),
    onSuccess: (wallet, { id, clientId }) => {
      inv.qc.setQueryData(queryKeys.finance.wallet(id), wallet);
      inv.wallet(id, clientId ?? wallet.client_id);
    },
  });
}

/**
 * Credit adjustment to a wallet's separate credit balance. `amount` is the
 * DECIMAL request input (validated server-side to minor units); callers
 * pass the operator-entered decimal string.
 */
export function useCreditAdjustment() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number;
      payload: {
        amount: string;
        direction: 'credit' | 'debit';
        currency_id?: number | null;
        trading_account_id?: number | null;
        comment?: string;
      };
    }) => api.post<FinanceTransaction>(`/clients/${clientId}/credit`, payload),
    onSuccess: (txn, { clientId }) => {
      inv.transaction(txn.id, clientId);
      if (txn.wallet_id) inv.wallet(txn.wallet_id, clientId);
    },
  });
}

/** Internal transfer between two same-currency wallets (posts immediately). */
export function useCreateTransfer() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: (payload: {
      from_wallet_id: number;
      to_wallet_id: number;
      amount: string;
      idempotency_key?: string;
      comment?: string;
    }) => api.post<FinanceTransaction>('/transfers', payload),
    onSuccess: (txn) => {
      inv.transaction(txn.id, txn.client_id);
      if (txn.wallet_id) inv.wallet(txn.wallet_id);
      if (txn.counterparty_wallet_id) inv.wallet(txn.counterparty_wallet_id);
    },
  });
}

/** Create a deposit (request or direct). `amount` is the decimal request input. */
export function useCreateDeposit() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number;
      payload: {
        amount: string;
        currency_id?: number | null;
        trading_account_id?: number | null;
        payment_method_id?: number | null;
        reference?: string;
        idempotency_key?: string;
        comment?: string;
        direct?: boolean;
      };
    }) => api.post<FinanceTransaction>(`/clients/${clientId}/deposits`, payload),
    onSuccess: (txn, { clientId }) => inv.transaction(txn.id, clientId),
  });
}

/** Create a withdrawal (request or direct). `amount` is the decimal input. */
export function useCreateWithdrawal() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      payload,
    }: {
      clientId: number;
      payload: {
        amount: string;
        currency_id?: number | null;
        trading_account_id?: number | null;
        payment_method_id?: number | null;
        reference?: string;
        idempotency_key?: string;
        comment?: string;
        direct?: boolean;
      };
    }) => api.post<FinanceTransaction>(`/clients/${clientId}/withdrawals`, payload),
    onSuccess: (txn, { clientId }) => inv.transaction(txn.id, clientId),
  });
}

export function useAddFinanceNote() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({
      clientId,
      body,
      transactionId,
    }: {
      clientId: number;
      body: string;
      transactionId?: number | null;
    }) =>
      api.post<FinanceNote>(`/clients/${clientId}/finance/notes`, {
        body,
        finance_transaction_id: transactionId,
      }),
    onSuccess: (_n, { clientId }) =>
      inv.qc.invalidateQueries({ queryKey: queryKeys.finance.clientNotes(clientId) }),
  });
}

export function useDeleteFinanceNote() {
  const inv = useFinanceInvalidate();
  return useMutation({
    mutationFn: ({ noteId }: { noteId: number; clientId: number }) =>
      api.delete(`/finance/notes/${noteId}`),
    onSuccess: (_d, { clientId }) =>
      inv.qc.invalidateQueries({ queryKey: queryKeys.finance.clientNotes(clientId) }),
  });
}

/* ------------------------------------------------------------------ *
 * Payment-method administration (Sprint 9). CRUD gated behind
 * finance.methods.manage; writes invalidate every payment-method read
 * (both the active-only and full variants).
 * ------------------------------------------------------------------ */
function usePaymentMethodInvalidate() {
  const qc = useQueryClient();
  return () =>
    qc.invalidateQueries({ queryKey: ['finance', 'payment-methods'] });
}

export function useCreatePaymentMethod() {
  const inv = usePaymentMethodInvalidate();
  return useMutation({
    mutationFn: (payload: Partial<PaymentMethod>) =>
      api.post<PaymentMethod>('/payment-methods', payload),
    onSuccess: inv,
  });
}

export function useUpdatePaymentMethod() {
  const inv = usePaymentMethodInvalidate();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<PaymentMethod> }) =>
      api.patch<PaymentMethod>(`/payment-methods/${id}`, payload),
    onSuccess: inv,
  });
}

export function useDeletePaymentMethod() {
  const inv = usePaymentMethodInvalidate();
  return useMutation({
    mutationFn: (id: number) => api.delete<void>(`/payment-methods/${id}`),
    onSuccess: inv,
  });
}

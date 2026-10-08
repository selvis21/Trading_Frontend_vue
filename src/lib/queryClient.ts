import { QueryClient } from '@tanstack/vue-query';
import { isApiError } from '@/services/api';

/* ------------------------------------------------------------------ *
 * Query layer — single QueryClient with enterprise-sensible defaults.
 * Server state lives here; client/UI state lives in Pinia.
 * ------------------------------------------------------------------ */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30s: lists feel live without hammering the API
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry auth / validation / not-found; retry transient errors twice.
        if (isApiError(error) && [401, 403, 404, 422].includes(error.status)) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

/** Centralised query keys to keep cache invalidation consistent. */
export const queryKeys = {
  me: ['auth', 'me'] as const,
  preferences: ['profile', 'preferences'] as const,
  notifications: ['notifications'] as const,
  leads: {
    list: (scope: string, params: Record<string, unknown>) =>
      ['leads', 'list', scope, params] as const,
    detail: (id: number) => ['leads', 'detail', id] as const,
    notes: (id: number) => ['leads', id, 'notes'] as const,
    timeline: (id: number) => ['leads', id, 'timeline'] as const,
    trackHistory: (id: number) => ['leads', id, 'track-history'] as const,
  },
  clients: {
    list: (params: Record<string, unknown>) =>
      ['clients', 'list', params] as const,
    detail: (id: number) => ['clients', 'detail', id] as const,
  },
  applications: {
    list: (params: Record<string, unknown>) =>
      ['applications', 'list', params] as const,
    detail: (reference: string) => ['applications', 'detail', reference] as const,
  },
  sales: {
    statuses: ['sales', 'lead-statuses'] as const,
    statusReasons: (statusId: number) =>
      ['sales', 'status-reasons', statusId] as const,
    campaignSources: ['sales', 'campaign-sources'] as const,
    tags: ['sales', 'tags'] as const,
    assignableUsers: ['sales', 'assignable-users'] as const,
  },
  mentions: (includeProcessed: boolean) =>
    ['mentions', { includeProcessed }] as const,
  compliance: {
    metrics: ['compliance', 'metrics'] as const,
    applications: (params: Record<string, unknown>) =>
      ['compliance', 'applications', params] as const,
    application: (id: number) => ['compliance', 'application', id] as const,
    applicationHistory: (id: number) =>
      ['compliance', 'application', id, 'history'] as const,
    profiles: (params: Record<string, unknown>) =>
      ['compliance', 'profiles', params] as const,
    clientProfile: (clientId: number) =>
      ['compliance', 'client', clientId, 'kyc'] as const,
    clientDocuments: (clientId: number) =>
      ['compliance', 'client', clientId, 'documents'] as const,
    clientTimeline: (clientId: number) =>
      ['compliance', 'client', clientId, 'timeline'] as const,
    clientNotes: (clientId: number) =>
      ['compliance', 'client', clientId, 'notes'] as const,
    documentTypes: ['compliance', 'document-types'] as const,
  },
  trading: {
    metrics: ['trading', 'metrics'] as const,
    accounts: (params: Record<string, unknown>) =>
      ['trading', 'accounts', params] as const,
    account: (id: number) => ['trading', 'account', id] as const,
    accountHistory: (id: number) =>
      ['trading', 'account', id, 'history'] as const,
    accountTimeline: (id: number) =>
      ['trading', 'account', id, 'timeline'] as const,
    requests: (params: Record<string, unknown>) =>
      ['trading', 'requests', params] as const,
    request: (id: number) => ['trading', 'request', id] as const,
    platforms: (active: boolean) =>
      ['trading', 'platforms', { active }] as const,
    groups: (params: Record<string, unknown>) =>
      ['trading', 'groups', params] as const,
    lifecycle: (clientId: number) =>
      ['trading', 'lifecycle', clientId] as const,
  },
  finance: {
    metrics: ['finance', 'metrics'] as const,
    currencies: ['finance', 'currencies'] as const,
    transactions: (params: Record<string, unknown>) =>
      ['finance', 'transactions', params] as const,
    transaction: (id: number) => ['finance', 'transaction', id] as const,
    transactionHistory: (id: number) =>
      ['finance', 'transaction', id, 'history'] as const,
    paymentMethods: (active: boolean) =>
      ['finance', 'payment-methods', { active }] as const,
    ledger: (params: Record<string, unknown>) =>
      ['finance', 'ledger', params] as const,
    clientWallets: (clientId: number) =>
      ['finance', 'client', clientId, 'wallets'] as const,
    wallet: (id: number) => ['finance', 'wallet', id] as const,
    walletLedger: (id: number) => ['finance', 'wallet', id, 'ledger'] as const,
    clientTimeline: (clientId: number) =>
      ['finance', 'client', clientId, 'timeline'] as const,
    clientNotes: (clientId: number) =>
      ['finance', 'client', clientId, 'notes'] as const,
    typeCounts: ['finance', 'type-counts'] as const,
  },
  reports: {
    catalog: ['reports', 'catalog'] as const,
    run: (key: string, params: Record<string, unknown>) =>
      ['reports', 'run', key, params] as const,
    scheduled: ['reports', 'scheduled'] as const,
    schedule: (id: number) => ['reports', 'scheduled', id] as const,
  },
  dashboard: {
    index: ['dashboard', 'index'] as const,
    typed: (key: string, range?: { from: string; to: string }) =>
      range
        ? (['dashboard', key, range] as const)
        : (['dashboard', key] as const),
    activity: (limit: number) => ['dashboard', 'activity', limit] as const,
    pendingActions: ['dashboard', 'pending-actions'] as const,
    alerts: ['dashboard', 'alerts'] as const,
  },
  admin: {
    users: (params: Record<string, unknown>) =>
      ['admin', 'users', params] as const,
    user: (id: number) => ['admin', 'user', id] as const,
    roles: ['admin', 'roles'] as const,
    role: (id: number) => ['admin', 'role', id] as const,
    permissions: ['admin', 'permissions'] as const,
    teams: ['admin', 'teams'] as const,
    team: (id: number) => ['admin', 'team', id] as const,
    businessUnits: ['admin', 'business-units'] as const,
  },
  reference: {
    countries: (params: Record<string, unknown>) =>
      ['reference', 'countries', params] as const,
    zones: (params: Record<string, unknown>) =>
      ['reference', 'zones', params] as const,
    currencies: (params: Record<string, unknown>) =>
      ['reference', 'currencies', params] as const,
    languages: (params: Record<string, unknown>) =>
      ['reference', 'languages', params] as const,
    optionModules: ['reference', 'option-modules'] as const,
    options: (params: Record<string, unknown>) =>
      ['reference', 'options', params] as const,
    settings: (group?: string) =>
      group
        ? (['reference', 'settings', group] as const)
        : (['reference', 'settings'] as const),
  },
  list: (resource: string, params?: Record<string, unknown>) =>
    params ? ([resource, 'list', params] as const) : ([resource, 'list'] as const),
  detail: (resource: string, id: string | number) =>
    [resource, 'detail', id] as const,
};

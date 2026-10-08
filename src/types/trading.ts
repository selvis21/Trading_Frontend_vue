/* ------------------------------------------------------------------ *
 * Trading domain types — mirror app/Domains/Trading/*. The trading API
 * identifies clients by client_id only (no client-name endpoint), so
 * the UI labels accounts by login + client id and cross-links to the
 * client 360° for the human-readable identity.
 * ------------------------------------------------------------------ */

export type TradingAccountStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'closed'
  | 'rejected';

export type TradingAccountType = 'demo' | 'live' | 'ib';

export type TradingRequestStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled';

/** Mirrors TradingActivityType (app/Domains/Trading/Enums). */
export type TradingActivityKind =
  | 'requested'
  | 'request_approved'
  | 'request_rejected'
  | 'request_cancelled'
  | 'account_created'
  | 'account_suspended'
  | 'account_resumed'
  | 'account_closed'
  | 'leverage_changed'
  | 'status_changed';

export interface TradingPlatform {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  groups?: TradingGroup[];
}

export interface TradingGroup {
  id: number;
  trading_platform_id: number;
  code: string;
  name: string;
  account_kind: TradingAccountType | null;
  default_leverage: number | null;
  is_active: boolean;
}

export interface TradingAccount {
  id: number;
  client_id: number;
  trading_platform_id: number;
  trading_group_id: number | null;
  currency_id: number | null;
  login: string | null;
  account_type: TradingAccountType | null;
  status: TradingAccountStatus | null;
  name: string | null;
  leverage: number | null;
  color: string | null;
  server: string | null;
  opened_at: string | null;
  suspended_at: string | null;
  closed_at: string | null;
  platform?: TradingPlatform | Record<string, never>;
  group?: TradingGroup | Record<string, never>;
  created_at: string | null;
}

export interface TradingAccountRequest {
  id: number;
  client_id: number;
  trading_platform_id: number;
  trading_group_id: number | null;
  currency_id: number | null;
  account_type: TradingAccountType | null;
  requested_leverage: number | null;
  status: TradingRequestStatus | null;
  requested_by: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  trading_account_id: number | null;
  account?: TradingAccount | Record<string, never>;
  created_at: string | null;
}

export interface TradingAccountStatusHistory {
  id: number;
  trading_account_id: number;
  from_status: TradingAccountStatus | string | null;
  to_status: TradingAccountStatus | string | null;
  reason: string | null;
  changed_by: number | null;
  created_at: string | null;
}

export interface TradingActivity {
  id: number;
  client_id: number;
  trading_account_id: number | null;
  user_id: number | null;
  type: TradingActivityKind | string | null;
  description: string | null;
  properties: Record<string, unknown> | null;
  created_at: string | null;
}

/** Shape of GET /trading/metrics → data. */
export interface TradingMetrics {
  accounts_by_status: Record<TradingAccountStatus, number>;
  /** keyed by trading_platform_id (string keys from JSON objects). */
  accounts_by_platform: Record<string, number>;
  total: number;
}

/** Account list tabs → the account status they filter to. */
export type AccountView =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'closed'
  | 'rejected'
  | 'all';

export const ACCOUNT_VIEW_STATUS: Record<
  AccountView,
  TradingAccountStatus | undefined
> = {
  active: 'active',
  pending: 'pending',
  suspended: 'suspended',
  closed: 'closed',
  rejected: 'rejected',
  all: undefined,
};

/** Request queue tabs → the request status they filter to. */
export type RequestView = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'all';

export const REQUEST_VIEW_STATUS: Record<
  RequestView,
  TradingRequestStatus | undefined
> = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  cancelled: 'cancelled',
  all: undefined,
};

/** Lifecycle read-model — mirrors GET /clients/{client}/trading-lifecycle. */
export type LifecycleStageState = 'done' | 'current' | 'pending' | 'skipped';

export interface LifecycleStage {
  key: string;
  label: string;
  state: LifecycleStageState;
  next_action: string | null;
}

export interface LifecycleAccountRef {
  id: number;
  login: string | null;
  account_type: TradingAccountType | null;
  status: TradingAccountStatus | null;
  trading_platform_id: number | null;
}

export interface LifecycleApplicationRef {
  id: number;
  account_type: TradingAccountType | null;
  status: TradingRequestStatus | null;
  score: number | null;
  trading_account_id: number | null;
}

export interface LifecycleApplicationScore {
  application_id: number;
  score: number | null;
  band: string | null;
  source: string | null;
  scored_at: string | null;
}

export interface TradingLifecycle {
  client_id: number;
  client_code: string | null;
  client_name: string;
  is_contact_only: boolean;
  kyc_verified: boolean;
  stages: LifecycleStage[];
  current_stage: string | null;
  next_actions: string[];
  is_complete: boolean;
  has_demo: boolean;
  has_live: boolean;
  application_score: LifecycleApplicationScore | null;
  accounts: LifecycleAccountRef[];
  applications: LifecycleApplicationRef[];
}

/** Human labels for backend lifecycle action keys (presentation only — the
 * keys and availability come from the backend, never re-derived here). */
export const LIFECYCLE_ACTION_LABELS: Record<string, string> = {
  create_client: 'Create client',
  submit_demo_application: 'Submit demo application',
  create_demo_account: 'Create demo account',
  fund_demo_account: 'Fund demo account',
  record_demo_trade: 'Record demo trade',
  submit_live_application: 'Submit live application',
  score_application: 'Score application',
  create_real_account: 'Create real account',
  make_deposit: 'Make deposit',
  record_live_trade: 'Record live trade',
};

/** Account-type pill tone — `ib` is premium (accent), `live` info, `demo` neutral. */
export const ACCOUNT_TYPE_TONE: Record<TradingAccountType, 'accent' | 'info' | 'neutral'> = {
  ib: 'accent',
  live: 'info',
  demo: 'neutral',
};

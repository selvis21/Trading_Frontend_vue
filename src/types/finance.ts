/* ------------------------------------------------------------------ *
 * Finance domain types — mirror app/Domains/Finance/*.
 *
 * MONEY CONTRACT: every money field is an INTEGER in minor units (cents).
 * The API also ships a parallel `*_decimal` string for convenience, but
 * the UI treats the integer minor-unit field as the single source of
 * truth and renders it exclusively through `formatMoney` (see
 * composables/useMoney.ts). Never parse the decimal string for maths and
 * never do floating-point arithmetic on money.
 * ------------------------------------------------------------------ */

export type TransactionStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer'
  | 'credit'
  | 'fee'
  | 'adjustment';

export type WalletStatus = 'active' | 'frozen';
export type LedgerDirection = 'debit' | 'credit';
export type LedgerEntryKind =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
  | 'credit'
  | 'fee'
  | 'adjustment';
export type BalanceType = 'cash' | 'credit';
export type PaymentMethodType = 'manual' | 'gateway';

export type FinanceActivityKind =
  | 'transaction_created'
  | 'transaction_approved'
  | 'transaction_rejected'
  | 'transaction_completed'
  | 'transaction_cancelled'
  | 'deposit_posted'
  | 'withdrawal_posted'
  | 'transfer_posted'
  | 'credit_posted'
  | 'wallet_created'
  | 'wallet_frozen'
  | 'wallet_unfrozen'
  | 'note_added';

/** Platform currency reference (GET /currencies). decimal_places drives scale. */
export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string | null;
  decimal_places: number;
  is_active: boolean;
}

export interface LedgerEntry {
  id: number;
  finance_transaction_id: number;
  wallet_id: number;
  client_id: number;
  trading_account_id: number | null;
  currency_id: number | null;
  balance_type: BalanceType | null;
  direction: LedgerDirection | null;
  kind: LedgerEntryKind | null;
  /** minor units, always positive */
  amount: number;
  amount_decimal: string;
  /** minor units */
  balance_before: number;
  /** minor units */
  balance_after: number;
  description: string | null;
  created_at: string | null;
}

export interface FinanceTransactionStatusHistory {
  id: number;
  finance_transaction_id: number;
  from_status: TransactionStatus | string | null;
  to_status: TransactionStatus | string | null;
  reason: string | null;
  changed_by: number | null;
  created_at: string | null;
}

export interface FinanceTransaction {
  id: number;
  client_id: number;
  trading_account_id: number | null;
  wallet_id: number | null;
  counterparty_wallet_id: number | null;
  payment_method_id: number | null;
  currency_id: number | null;
  type: TransactionType | null;
  status: TransactionStatus | null;
  /** minor units */
  amount: number;
  amount_decimal: string;
  /** minor units, nullable */
  fee_amount: number | null;
  reference: string | null;
  comment: string | null;
  requested_by: number | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  decision_reason: string | null;
  posted_at: string | null;
  ledger_entries?: LedgerEntry[];
  status_histories?: FinanceTransactionStatusHistory[];
  created_at: string | null;
}

export interface Wallet {
  id: number;
  client_id: number;
  currency_id: number | null;
  /** cash balance, minor units */
  balance: number;
  balance_decimal: string;
  /** credit/bonus balance, minor units */
  credit_balance: number;
  credit_balance_decimal: string;
  status: WalletStatus | null;
  created_at: string | null;
}

export interface PaymentMethod {
  id: number;
  code: string;
  name: string;
  type: PaymentMethodType | null;
  is_active: boolean;
}

export interface FinanceNote {
  id: number;
  client_id: number;
  finance_transaction_id: number | null;
  body: string;
  created_by: number | null;
  created_at: string | null;
}

export interface FinanceActivity {
  id: number;
  client_id: number;
  finance_transaction_id: number | null;
  user_id: number | null;
  type: FinanceActivityKind | string | null;
  description: string | null;
  /** may carry an integer minor-unit `amount` */
  properties: Record<string, unknown> | null;
  created_at: string | null;
}

/** Shape of GET /finance/metrics → data. Money totals are minor units. */
export interface FinanceMetrics {
  transactions_by_status: Record<TransactionStatus, number>;
  /** completed deposit total, minor units */
  completed_deposits_total: number;
  /** completed withdrawal total, minor units */
  completed_withdrawals_total: number;
  total: number;
}

/* ---- Transaction workspace views ---- */
export type TransactionView =
  | 'pending'
  | 'deposits'
  | 'withdrawals'
  | 'transfers'
  | 'credits'
  | 'rejected'
  | 'all';

/** A view resolves to a {type?, status?} filter pair for the list endpoint. */
export const TRANSACTION_VIEW_FILTER: Record<
  TransactionView,
  { type?: TransactionType; status?: TransactionStatus }
> = {
  pending: { status: 'pending' },
  deposits: { type: 'deposit' },
  withdrawals: { type: 'withdrawal' },
  transfers: { type: 'transfer' },
  credits: { type: 'credit' },
  rejected: { status: 'rejected' },
  all: {},
};

import type { StatusTone } from '@/types';

/** Transaction-type pill tone (distinct from the status badge). */
export const TRANSACTION_TYPE_TONE: Record<TransactionType, StatusTone> = {
  deposit: 'success',
  withdrawal: 'warning',
  transfer: 'info',
  credit: 'accent',
  fee: 'neutral',
  adjustment: 'neutral',
};

/** Ledger/transaction kinds that move money INTO a wallet (positive sign). */
export const INFLOW_KINDS: ReadonlySet<LedgerEntryKind> = new Set<LedgerEntryKind>([
  'deposit',
  'transfer_in',
  'credit',
]);

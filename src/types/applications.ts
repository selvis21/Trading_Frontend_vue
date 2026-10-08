import type { TradingAccountType, TradingActivity } from '@/types/trading';

/**
 * Canonical Application record — mirrors TradingAccountRequestResource as
 * returned by GET /applications (list) and GET /applications/{ref}/detail.
 * One shape powers the Applications menu, the client-360° panel and the
 * compliance profile's Applications tab.
 */
export interface ApplicationRecord {
  id: number;
  reference: string;
  /** null for a lead-stage draft (no client yet). */
  lead_id: number | null;
  client_id: number | null;
  trading_platform_id: number | null;
  trading_group_id: number | null;
  currency_id: number | null;
  account_type: TradingAccountType | null;
  requested_leverage: number | null;
  status: string | null;
  decision_reason: string | null;
  trading_account_id: number | null;
  is_demo: boolean;
  is_live: boolean;
  is_draft: boolean;
  score: number | null;
  score_band: string | null;
  score_source: string | null;
  client?: {
    id: number;
    client_code: string | null;
    name: string;
    email: string | null;
    mobile: string | null;
  } | null;
  lead?: {
    id: number;
    name: string;
    email: string | null;
    mobile: string | null;
  } | null;
  platform?: { id: number; code: string; name: string } | null;
  kyc_status: string | null;
  kyc_approved: boolean;
  requires_kyc: boolean;
  can_approve: boolean;
  approval_blocked_reason: string | null;
  account?: { id: number; login: string | null; status: string | null } | null;
  /** The application's lifecycle events (GET …/detail only). */
  activities?: TradingActivity[];
  created_at: string | null;
  updated_at: string | null;
}

/* ------------------------------------------------------------------ *
 * Applications (Demo + Live) — the CRM's reproduction of the public
 * Website application flows. Types mirror the response of the shared
 * intake service (WebsiteApplicationService::present()) returned by
 * both POST /api/v1/website/applications and POST /api/v1/applications.
 * ------------------------------------------------------------------ */

/** The lifecycle slice embedded in an application submission response. */
export interface ApplicationLifecycleSummary {
  current_stage: string | null;
  next_actions: string[];
  stages: {
    key: string;
    label: string;
    state: 'done' | 'current' | 'pending' | 'skipped';
    next_action: string | null;
  }[];
}

/** Shape of the shared `present()` payload (reference + lifecycle). */
export interface ApplicationSubmission {
  reference: string;
  replayed: boolean;
  client: {
    id: number;
    client_code: string;
    name: string;
  };
  application: {
    id: number;
    type: TradingAccountType;
    trading_platform_id: number | null;
    trading_group_id: number | null;
    status: string | null;
    requested_leverage: number | null;
    submitted_at: string | null;
  };
  lifecycle: ApplicationLifecycleSummary;
  kyc: {
    verified: boolean;
  };
}

/** Platform choice as the website posts it (1 = MT4, 2 = MT5). */
export type WebsitePlatform = 'mt4' | 'mt5';

/** Fields collected by the ACTIVE website demo form (open_demo_account.php). */
export interface DemoApplicationForm {
  firstname: string;
  lastname: string;
  email: string;
  email2: string;
  country: string; // ISO2, as the website select posts
  callcode: string; // auto-filled from the country's phone code
  phone: string;
  agreecom: boolean; // the website's consent checkbox
  platform: WebsitePlatform;
  referral_code: string; // hidden on the website (query param); operator may know it
}

/**
 * Fields collected by the ACTIVE website live form (open_live_account.php):
 * identity + contact only — the questionnaire/tax/financial sections exist in
 * the live controller but are commented out in the deployed view. The optional
 * qstn extras below map onto the r[] array that controller still reads.
 */
export interface LiveApplicationForm {
  firstname: string;
  lastname: string;
  email: string;
  confirm_email: string;
  country: string; // ISO2
  callcode: string;
  phone: string;
  platform: WebsitePlatform;
  agree: boolean; // the live form's consent checkbox
  // Optional r[] questionnaire extras (legacy keys, all optional here):
  passport_no: string;
  annual_income: string;
  job_status: string;
  estimated_net_worth: string;
  source_of_wealth: string[]; // multi-select checkbox values
  declaration_name: string;
  declaration_sign: string;
  declaration_date: string;
}

/** Exact option values from the website's live questionnaire (source of truth). */
export const WEBSITE_JOB_STATUS_OPTIONS = [
  'Employed',
  'Self Employed',
  'Retired',
  'Student',
  'Unemployed',
] as const;

export const WEBSITE_NET_WORTH_OPTIONS = [
  '> $5,000,000',
  '$1,000,000 - $5,000,000',
  '$500,000 - $1,000,000',
  '$250,000 - $500,000',
  '$100,000 - $250,000',
  '$50,000 - $100,000',
  '$0 - $50,000',
] as const;

export const WEBSITE_SOURCE_OF_WEALTH_OPTIONS = [
  'Salary/Wages',
  'Business Income',
  'Investment Income',
  'Inheritance',
  'Savings',
  'Sale of Property',
  'Other',
] as const;

import type { StatusTone } from '@/types';

/* ------------------------------------------------------------------ *
 * Canonical enum → semantic tone mapping. Single source of truth so a
 * `verified`/`active`/`approved` always reads emerald, a `rejected`/
 * `failed`/`closed` always reads red, everywhere in the product.
 * (See docs/frontend-architecture.md §1.2.)
 *
 * Every component that renders a status pill/badge consumes this —
 * there is deliberately NO per-page status colour map. Adding a status
 * here is the only way to give it a colour.
 * ------------------------------------------------------------------ */
const TONE_MAP: Record<string, StatusTone> = {
  // neutral / draft / untouched / not started / inactive
  draft: 'neutral',
  new: 'neutral',
  not_started: 'neutral',
  inactive: 'neutral',
  demo: 'neutral',
  cancelled: 'neutral',
  canceled: 'neutral',
  archived: 'neutral',
  na: 'neutral',
  // info / contacted / in progress / processing
  // ('new' is deliberately NOT here — as a pipeline status it means
  //  untouched, which reads as slate; it maps to neutral with draft.)
  contacted: 'info',
  in_progress: 'info',
  in_review: 'info',
  under_review: 'info',
  submitted: 'info',
  processing: 'info',
  initiated: 'info',
  open: 'info',
  // warning / attention / waiting / on hold
  pending: 'warning',
  pending_review: 'warning',
  follow_up: 'warning',
  waiting: 'warning',
  on_hold: 'warning',
  suspended: 'warning',
  frozen: 'warning',
  overdue: 'warning',
  unpaid: 'warning',
  not_verified: 'warning',
  // success / approved / completed / converted
  verified: 'success',
  active: 'success',
  approved: 'success',
  completed: 'success',
  converted: 'success',
  resolved: 'success',
  deposited: 'success',
  paid: 'success',
  won: 'success',
  // danger / rejected / failed / blocked / expired
  rejected: 'danger',
  declined: 'danger',
  failed: 'danger',
  blocked: 'danger',
  expired: 'danger',
  closed: 'danger',
  blacklisted: 'danger',
  disabled: 'danger',
  lost: 'danger',
  // accent / premium / high-intent
  interested: 'accent',
  ib: 'accent',
  promotion: 'accent',
  vip: 'accent',
};

/**
 * Normalise a free-text status label ("Follow Up", "follow-up", "IN REVIEW")
 * into the snake_case key the map is written in.
 */
function normalise(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[\s\-/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

export function toneForStatus(status: string | null | undefined): StatusTone {
  if (!status) return 'neutral';
  return TONE_MAP[normalise(status)] ?? 'neutral';
}

/* ------------------------------------------------------------------ *
 * Lead statuses are CONFIGURABLE master data (`lead_statuses`), so they
 * cannot be hard-coded by id. They resolve by business meaning:
 *
 *   1. The pipeline's own outcome flags win — `is_lost` is always red and
 *      `is_won` always green, whatever the status happens to be called.
 *      This keeps custom statuses ("Closed Lost", "Trial Won") correct
 *      without a code change.
 *   2. Otherwise the status NAME is looked up in the same canonical map
 *      every other status in the product uses.
 *
 * This replaced rendering straight from `lead_statuses.color`, which is
 * NULL for every seeded row — that made all six statuses fall back to
 * the same neutral grey (see LeadStatusPill / LeadKanban).
 * ------------------------------------------------------------------ */
export interface LeadStatusLike {
  name?: string | null;
  is_won?: boolean | number | null;
  is_lost?: boolean | number | null;
}

export function toneForLeadStatus(
  status: LeadStatusLike | string | null | undefined,
): StatusTone {
  if (status == null) return 'neutral';

  if (typeof status === 'string') return toneForStatus(status);

  if (status.is_lost) return 'danger';
  if (status.is_won) return 'success';

  return toneForStatus(status.name);
}

/* Tailwind only emits utilities it can see as literal class strings, so
 * tone→class lookups must be written out in full. This is the one place
 * a tone becomes a utility class. */
const TONE_BG_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-status-neutral',
  info: 'bg-status-info',
  warning: 'bg-status-warning',
  success: 'bg-status-success',
  danger: 'bg-status-danger',
  accent: 'bg-status-accent',
};

export function toneDotClass(tone: StatusTone): string {
  return TONE_BG_CLASS[tone];
}

export function useStatusTone() {
  return { toneForStatus, toneForLeadStatus, toneDotClass };
}
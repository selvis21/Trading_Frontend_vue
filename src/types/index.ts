/* ------------------------------------------------------------------ *
 * Shared domain & transport types mirroring the Laravel API contract.
 * The API speaks a uniform envelope: { code, message, data }.
 * ------------------------------------------------------------------ */

/** The API envelope uses a numeric status code + `msg`. */
export type ApiCode = number | string;

export interface ApiEnvelope<T = unknown> {
  code: ApiCode;
  /** Human message (the backend key is `msg`). */
  msg?: string | null;
  message?: string | null;
  data: T;
}

/** Server-side paginated list payload (data.rows + meta). */
export interface Paginated<T> {
  total: number;
  rows: T[];
  page: number;
  page_size: number;
  last_page: number;
}

/** Normalised error surfaced to the UI by the API client. */
export interface ApiError {
  status: number;
  message: string;
  /** Laravel 422 field errors, keyed by input name. */
  errors?: Record<string, string[]>;
  code?: ApiCode;
}

export type UserStatus = 'active' | 'disabled';
export type UserType = 'regular' | 'sub' | 'ib';

export interface AuthUser {
  id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  level: number;
  level_label: string | null;
  user_type: string | null;
  status: string | null;
  business_unit_id: number | null;
  zone_unit_id: number | null;
  colors: string[];
  avatar_path: string | null;
  is_online: boolean;
  roles: string[];
  last_login_at: string | null;
}

/** Shape of GET /api/v1/auth/me → data */
export interface MePayload {
  user: AuthUser;
  permissions: string[];
  must_update_password: boolean;
}

/** Shape of POST /api/v1/auth/login → data */
export interface LoginPayload {
  access_token: string;
  token_type: string;
  must_update_password: boolean;
  user: AuthUser;
}

export type Density = 'comfortable' | 'compact';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Locale = 'en' | 'zh' | 'ar';

/** Canonical semantic status tones used by StatusBadge & friends. */
export type StatusTone =
  | 'neutral'
  | 'info'
  | 'warning'
  | 'success'
  | 'danger'
  | 'accent';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  tone: StatusTone;
  href?: string;
  createdAt: string;
  read: boolean;
}

export interface TimelineEvent {
  id: string | number;
  type: string;
  title: string;
  description?: string;
  actor?: { name: string; avatar?: string | null };
  tone?: StatusTone;
  at: string;
}

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  AxiosError,
} from 'axios';
import type { ApiEnvelope, ApiError } from '@/types';

/* ------------------------------------------------------------------ *
 * API client layer.
 *
 * Wraps axios against the backend API, attaches the Sanctum bearer
 * token, and normalises the uniform { code, message, data } envelope so
 * callers receive `data` directly and a typed ApiError on failure.
 *
 * Standalone SPA: the API lives on a separate origin, so the base URL is
 * fully configurable via VITE_API_URL (e.g. http://crm-api.local/api/v1).
 * Auth is bearer-token only — no cross-site cookies — so withCredentials
 * is off, which keeps it compatible with a permissive (origin: *) CORS
 * policy on the backend.
 * ------------------------------------------------------------------ */

const TOKEN_KEY = 'crm.token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage unavailable — token lives only in memory for this session */
  }
}

// Absolute backend URL in the standalone SPA. Falls back to the same-origin
// relative prefix so a co-hosted/proxied deployment keeps working unchanged.
const baseURL =
  import.meta.env.VITE_API_URL ??
  `/${import.meta.env.VITE_API_PREFIX ?? 'api'}/v1`;

export const http: AxiosInstance = axios.create({
  baseURL,
  // Bearer-token auth — no cross-site cookies needed. Set VITE_API_WITH_CREDENTIALS=true
  // only if you switch to Sanctum's stateful cookie flow on a shared parent domain.
  withCredentials: import.meta.env.VITE_API_WITH_CREDENTIALS === 'true',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const csrf = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute('content');
  if (csrf) config.headers['X-CSRF-TOKEN'] = csrf;
  return config;
});

/** Listeners notified on a global 401 (session expiry) so stores can react. */
type StatusHandler = () => void;
const unauthorizedHandlers = new Set<StatusHandler>();
const forbiddenHandlers = new Set<StatusHandler>();

export function onUnauthorized(fn: StatusHandler): () => void {
  unauthorizedHandlers.add(fn);
  return () => unauthorizedHandlers.delete(fn);
}

/** Listeners notified on a global 403 (insufficient permission). */
export function onForbidden(fn: StatusHandler): () => void {
  forbiddenHandlers.add(fn);
  return () => forbiddenHandlers.delete(fn);
}

const INTENDED_KEY = 'crm.intended';

/** Remember where the user was headed so we can return after re-auth. */
export function rememberIntended(path: string): void {
  try {
    if (path && !path.startsWith('/login')) {
      localStorage.setItem(INTENDED_KEY, path);
    }
  } catch {
    /* noop */
  }
}

export function takeIntended(): string | null {
  try {
    const v = localStorage.getItem(INTENDED_KEY);
    localStorage.removeItem(INTENDED_KEY);
    return v;
  } catch {
    return null;
  }
}

function normalizeError(error: unknown): ApiError {
  if (error instanceof AxiosError) {
    const status = error.response?.status ?? 0;
    // Envelope: { code:int, msg:string, data:{ errors?: {field:[...]} } }.
    // (Some framework errors may also place message/errors at the top level.)
    const payload = error.response?.data as
      | {
          code?: number | string;
          msg?: string;
          message?: string;
          errors?: Record<string, string[]>;
          data?: { errors?: Record<string, string[]> };
        }
      | undefined;

    if (status === 401) {
      rememberIntended(window.location.pathname + window.location.search);
      unauthorizedHandlers.forEach((h) => h());
    } else if (status === 403) {
      forbiddenHandlers.forEach((h) => h());
    }

    return {
      status,
      message:
        payload?.msg ??
        payload?.message ??
        (status === 0
          ? 'Network error — please check your connection.'
          : error.message),
      errors: payload?.data?.errors ?? payload?.errors,
      code: payload?.code,
    };
  }
  return { status: 0, message: 'Unexpected error.' };
}

async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const res = await http.request<ApiEnvelope<T>>(config);
    return res.data.data;
  } catch (error) {
    throw normalizeError(error);
  }
}

/** Thin, typed verbs returning the unwrapped `data`. */
export const api = {
  get: <T>(url: string, params?: Record<string, unknown>) =>
    request<T>({ method: 'get', url, params }),
  post: <T>(url: string, body?: unknown) =>
    request<T>({ method: 'post', url, data: body }),
  put: <T>(url: string, body?: unknown) =>
    request<T>({ method: 'put', url, data: body }),
  patch: <T>(url: string, body?: unknown) =>
    request<T>({ method: 'patch', url, data: body }),
  delete: <T>(url: string, body?: unknown) =>
    request<T>({ method: 'delete', url, data: body }),
  raw: http,
};

export function isApiError(e: unknown): e is ApiError {
  return (
    typeof e === 'object' && e !== null && 'status' in e && 'message' in e
  );
}

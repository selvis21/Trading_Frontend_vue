import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { router } from '@inertiajs/vue3';
import {
  api,
  getToken,
  setToken,
  onUnauthorized,
  takeIntended,
} from '@/services/api';
import { queryClient, queryKeys } from '@/lib/queryClient';
import type { AuthUser, LoginPayload, MePayload } from '@/types';

/* ------------------------------------------------------------------ *
 * Auth store — session user, permissions, and the capability gate.
 * The single source of truth for "who am I / what can I do".
 * ------------------------------------------------------------------ */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const permissions = ref<Set<string>>(new Set());
  const mustUpdatePassword = ref(false);
  const ready = ref(false); // hydration attempted
  const token = ref<string | null>(getToken());

  const isAuthenticated = computed(() => !!user.value);
  const level = computed(() => user.value?.level ?? Number.POSITIVE_INFINITY);

  /** Feature-axis gate. Mirrors Spatie permissions; server still enforces. */
  function can(permission: string): boolean {
    return permissions.value.has(permission);
  }
  function canAny(list: string[]): boolean {
    return list.some((p) => permissions.value.has(p));
  }
  function canAll(list: string[]): boolean {
    return list.every((p) => permissions.value.has(p));
  }
  /** Data-axis helper: levels are 1 (TechAdmin) → 6 (Agent), lower = more. */
  function atLeastLevel(maxLevel: number): boolean {
    return level.value <= maxLevel;
  }
  function hasRole(role: string): boolean {
    return user.value?.roles.includes(role) ?? false;
  }

  function applyMe(payload: MePayload): void {
    user.value = payload.user;
    permissions.value = new Set(payload.permissions);
    mustUpdatePassword.value = payload.must_update_password;
  }

  async function login(
    email: string,
    password: string,
  ): Promise<LoginPayload> {
    const data = await api.post<LoginPayload>('/auth/login', {
      email,
      password,
      device_name: 'spa',
    });
    setToken(data.access_token);
    token.value = data.access_token;
    user.value = data.user;
    mustUpdatePassword.value = data.must_update_password;

    // The login payload lacks the permission set, so pull /auth/me and prime
    // the query cache so the app's useMeQuery resolves instantly post-redirect.
    const me = await api.get<MePayload>('/auth/me');
    applyMe(me);
    queryClient.setQueryData(queryKeys.me, me);
    ready.value = true;
    return data;
  }

  /** Where to land after a successful login (honours the intended URL). */
  function postLoginTarget(): string {
    if (mustUpdatePassword.value) return '/password/reset';
    return takeIntended() ?? '/';
  }

  /**
   * Fetch + apply GET /auth/me, single-flight.
   *
   * The router guard hydrates before the layout mounts, and `useMeQuery`
   * hydrates once mounted; without sharing one in-flight promise each protected
   * hard load would call /auth/me twice and burn the per-user API rate limit.
   */
  let inflight: Promise<MePayload> | null = null;
  async function loadMe(): Promise<MePayload> {
    if (inflight) return inflight;
    inflight = api.get<MePayload>('/auth/me').then((me) => {
      applyMe(me);
      return me;
    });
    try {
      return await inflight;
    } finally {
      inflight = null;
    }
  }

  /** Hydrate session from the stored token. Safe to call on boot. */
  async function hydrate(): Promise<void> {
    if (!token.value) {
      ready.value = true;
      return;
    }
    if (ready.value && isAuthenticated.value) return;
    try {
      const me = await loadMe();
      // Prime the query cache so the layout's useMeQuery mounts on this data
      // instead of issuing a second /auth/me for the same page load.
      queryClient.setQueryData(queryKeys.me, me);
    } catch {
      clearSession();
    } finally {
      ready.value = true;
    }
  }

  function clearSession(): void {
    user.value = null;
    permissions.value = new Set();
    mustUpdatePassword.value = false;
    token.value = null;
    setToken(null);
    queryClient.removeQueries({ queryKey: queryKeys.me });
    queryClient.removeQueries({ queryKey: queryKeys.preferences });
  }

  async function logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      /* revoke best-effort */
    }
    clearSession();
    router.visit('/login');
  }

  // Global 401 → drop session and bounce to login.
  onUnauthorized(() => {
    if (isAuthenticated.value) {
      clearSession();
      router.visit('/login');
    }
  });

  return {
    user,
    permissions,
    mustUpdatePassword,
    ready,
    token,
    isAuthenticated,
    level,
    can,
    canAny,
    canAll,
    atLeastLevel,
    hasRole,
    login,
    logout,
    hydrate,
    loadMe,
    applyMe,
    clearSession,
    postLoginTarget,
  };
});

import { useQuery } from '@tanstack/vue-query';
import { api } from '@/services/api';
import { queryKeys } from '@/lib/queryClient';
import { formatMoney } from '@/lib/utils';
import type { Currency } from '@/types/finance';

/* ------------------------------------------------------------------ *
 * Money formatting — the ONE place integer minor units become display
 * text. Resolves a transaction/wallet `currency_id` to its ISO code +
 * decimal scale (from GET /currencies) and defers all rendering to the
 * existing `formatMoney` utility. No floating-point arithmetic is ever
 * performed on money here or by callers; sums are integer additions on
 * minor units, and only the final integer is handed to `formatMoney`.
 * ------------------------------------------------------------------ */

const DEFAULT_CODE = 'USD';
const DEFAULT_DECIMALS = 2;

/** Cached currency reference (id → {code, decimal_places}). */
export function useCurrencies() {
  return useQuery({
    queryKey: queryKeys.finance.currencies,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    queryFn: () => api.get<Currency[]>('/currencies'),
  });
}

export function useMoney() {
  const currencies = useCurrencies();

  function metaFor(currencyId: number | null | undefined): {
    code: string;
    decimals: number;
  } {
    const c = currencyId
      ? currencies.data.value?.find((x) => x.id === currencyId)
      : undefined;
    return {
      code: c?.code ?? DEFAULT_CODE,
      decimals: c?.decimal_places ?? DEFAULT_DECIMALS,
    };
  }

  /**
   * Format an INTEGER minor-unit amount for display. `signed` prefixes an
   * explicit + / − (for ledger movements); the magnitude is taken with
   * integer `Math.abs` — never a float operation.
   */
  function formatMinor(
    minorUnits: number | null | undefined,
    currencyId?: number | null,
    opts?: { signed?: boolean },
  ): string {
    const value = Math.trunc(minorUnits ?? 0);
    const { code, decimals } = metaFor(currencyId);
    if (opts?.signed) {
      const sign = value > 0 ? '+' : value < 0 ? '−' : '';
      return `${sign}${formatMoney(Math.abs(value), code, decimals)}`;
    }
    return formatMoney(value, code, decimals);
  }

  function codeFor(currencyId: number | null | undefined): string {
    return metaFor(currencyId).code;
  }

  return { currencies, formatMinor, codeFor, metaFor };
}

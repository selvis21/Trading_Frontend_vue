import { formatMoney } from '@/lib/utils';
import type { ReportColumnType } from '@/types/reports';

/* ------------------------------------------------------------------ *
 * Report value formatting. Column types are typed by the API; currency
 * values are INTEGER minor units rendered through formatMoney (base USD,
 * scale 2 — the reporting layer carries no per-row currency). No money
 * arithmetic is performed here — only Math.trunc to coerce the integer.
 * ------------------------------------------------------------------ */

const numberFmt = new Intl.NumberFormat();

export function formatReportValue(
  value: unknown,
  type: ReportColumnType,
): string {
  if (value === null || value === undefined || value === '') return '—';

  switch (type) {
    case 'currency': {
      const minor = typeof value === 'number' ? Math.trunc(value) : Math.trunc(Number(value) || 0);
      return formatMoney(minor, 'USD', 2);
    }
    case 'number': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? numberFmt.format(n) : String(value);
    }
    case 'percent': {
      const n = typeof value === 'number' ? value : Number(value);
      return Number.isFinite(n) ? `${n.toFixed(1)}%` : String(value);
    }
    case 'date': {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    }
    default:
      return String(value);
  }
}

/** Right-align numeric/currency/percent cells for scannable columns. */
export function isNumericType(type: ReportColumnType): boolean {
  return type === 'number' || type === 'currency' || type === 'percent';
}

/**
 * Best-effort type inference for an untyped summary key (the report summary
 * object carries no column metadata). `*_rate` → percent; money-ish keys on
 * finance reports → currency; otherwise number.
 */
export function inferSummaryType(key: string, category: string): ReportColumnType {
  const k = key.toLowerCase();
  if (/rate|percent|pct/.test(k)) return 'percent';
  if (
    category === 'finance' &&
    /total|net_flow|amount|deposit|withdrawal|flow|balance/.test(k)
  ) {
    return 'currency';
  }
  return 'number';
}

export function humaniseKey(key: string): string {
  return key.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useReportFormat() {
  return { formatReportValue, isNumericType, inferSummaryType, humaniseKey };
}

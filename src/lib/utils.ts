import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind class lists with conflict resolution (shadcn convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format an ISO timestamp as a short, locale-aware relative string. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const sec = Math.round(diff / 1000);
  const abs = Math.abs(sec);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
    ['second', 1],
  ];
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  for (const [unit, secs] of units) {
    if (abs >= secs || unit === 'second') {
      return rtf.format(-Math.round(sec / secs), unit);
    }
  }
  return '';
}

/** Format minor-unit integer money for display (currency-aware). */
export function formatMoney(
  minorUnits: number,
  currency = 'USD',
  decimals = 2,
): string {
  const value = minorUnits / 10 ** decimals;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
  }).format(value);
}

/** Format a large count compactly (1.2K, 3.4M). */
export function formatCompact(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Format a dashboard KPI value according to its declared format. */
export function formatKpi(
  value: number | string,
  format: 'number' | 'currency' | 'percent',
  currency = 'USD',
): string {
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  if (format === 'currency') return formatMoney(num, currency, 2);
  if (format === 'percent') return `${num.toFixed(1)}%`;
  return new Intl.NumberFormat().format(num);
}

/** Initials from a name, for avatar fallbacks. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/** Stable, deterministic hue (0-360) from a string — for avatar/tag colors. */
export function hueFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

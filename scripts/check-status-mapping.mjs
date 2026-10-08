#!/usr/bin/env node
/*
 * Status-mapping guard.
 *
 * The canonical status -> semantic tone map (src/composables/useStatusTone.ts)
 * is plain data, so it is verified here directly rather than through the
 * component tree. The project has no JS test runner; `vue-tsc` covers types
 * and `vite build` covers bundling, but neither would notice that a status
 * silently lost its colour — which is exactly how every lead status ended up
 * rendering as the same neutral grey.
 *
 * Run with:  node scripts/check-status-mapping.mjs   (or npm run check:status)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const failures = [];
const check = (label, ok, detail = '') => {
  if (ok) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

/* -- 1. Parse the canonical TONE_MAP ---------------------------------- */
const toneSrc = read('src/composables/useStatusTone.ts');
const mapBody = toneSrc.match(/const TONE_MAP[\s\S]*?\n};/);
if (!mapBody) {
  console.error('FATAL: could not locate TONE_MAP in useStatusTone.ts');
  process.exit(1);
}
const TONE_MAP = Object.fromEntries(
  [...mapBody[0].matchAll(/(\w+):\s*'(\w+)'/g)].map((m) => [m[1], m[2]]),
);
const TONES = ['neutral', 'info', 'warning', 'success', 'danger', 'accent'];

/** Mirrors normalise() in useStatusTone.ts. */
const normalise = (s) =>
  s.trim().toLowerCase().replace(/[\s\-/]+/g, '_').replace(/[^a-z0-9_]/g, '');

/** Mirrors toneForLeadStatus(): is_lost wins, then is_won, then the name. */
const toneForLeadStatus = ({ name, is_won, is_lost }) =>
  is_lost ? 'danger' : is_won ? 'success' : (TONE_MAP[normalise(name)] ?? 'neutral');

console.log('\nCanonical status mapping\n');

/* -- 2. Every mapped tone is a real tone ------------------------------ */
for (const [key, tone] of Object.entries(TONE_MAP)) {
  if (!TONES.includes(tone)) check(`TONE_MAP.${key}`, false, `unknown tone "${tone}"`);
}
check(
  `all ${Object.keys(TONE_MAP).length} TONE_MAP entries use a valid tone`,
  Object.values(TONE_MAP).every((t) => TONES.includes(t)),
);

/* -- 3. The REAL seeded lead statuses must be visually distinct --------
 * These six names/flags are exactly what SalesSeeder writes into
 * `lead_statuses`; if two of them resolve to the same tone the Lead list
 * looks monochrome again. */
const REAL_LEAD_STATUSES = [
  { name: 'New', is_won: false, is_lost: false },
  { name: 'Contacted', is_won: false, is_lost: false },
  { name: 'Follow Up', is_won: false, is_lost: false },
  { name: 'Interested', is_won: false, is_lost: false },
  { name: 'Converted', is_won: true, is_lost: false },
  { name: 'Lost', is_won: false, is_lost: true },
];

const resolved = REAL_LEAD_STATUSES.map((s) => ({
  ...s,
  tone: toneForLeadStatus(s),
}));
for (const r of resolved) console.log(`       ${r.name.padEnd(11)} -> ${r.tone}`);

const distinct = new Set(resolved.map((r) => r.tone));
check(
  `all ${REAL_LEAD_STATUSES.length} real lead statuses map to distinct tones`,
  distinct.size === REAL_LEAD_STATUSES.length,
  `got ${distinct.size} distinct: ${[...distinct].join(', ')}`,
);

check('Converted reads as success', resolved.find((r) => r.name === 'Converted').tone === 'success');
check('Lost reads as danger', resolved.find((r) => r.name === 'Lost').tone === 'danger');

/* -- 4. Major status surfaces still use the shared mapping -------------
 * If any of these went back to a local colour map the fix would be
 * cosmetic and the drift would return. */
const LEAD_STATUS_SURFACES = [
  'src/components/sales/LeadStatusPill.vue',
  'src/components/sales/LeadKanban.vue',
];
for (const file of LEAD_STATUS_SURFACES) {
  const src = read(file);
  check(
    `${file} consumes the central mapping`,
    /toneForLeadStatus/.test(src),
    'no toneForLeadStatus import',
  );
  check(
    `${file} no longer renders from lead_statuses.color`,
    !/status\.color|\.color \?\?/.test(src),
    'still reads the null DB colour column',
  );
}

const badgeSrc = read('src/components/ui/Badge.vue');
check(
  'Badge.vue exposes every semantic tone',
  TONES.every((t) => new RegExp(`${t}:`).test(badgeSrc)),
);
const statusBadgeSrc = read('src/components/ui/StatusBadge.vue');
check(
  'StatusBadge.vue delegates to the central mapping',
  /toneForStatus/.test(statusBadgeSrc),
);

/* -- 5. Button semantic variants exist -------------------------------- */
const buttonSrc = read('src/components/ui/Button.vue');
for (const variant of ['primary', 'success', 'warning', 'danger', 'info', 'secondary', 'outline', 'ghost', 'link']) {
  check(`Button.vue defines variant "${variant}"`, new RegExp(`^\\s*${variant}:`, 'm').test(buttonSrc));
}

/* -- 6. Semantic status tokens exist for BOTH themes ------------------ */
const css = read('src/css/app.css');
const block = (selector) => {
  const i = css.indexOf(`\n${selector} {`);
  if (i === -1) return null;
  const start = css.indexOf('{', i);
  const end = css.indexOf('\n}', start);
  return end === -1 ? null : css.slice(start, end);
};
const light = block(':root') ?? '';
const dark = block('.dark') ?? '';
check('app.css has a :root block', light !== '');
check('app.css has a .dark block', dark !== '');

const token = (src, tone) => src.match(new RegExp(`--status-${tone}:\\s*([^;]+);`))?.[1]?.trim();

for (const tone of TONES) {
  check(`light theme defines --status-${tone}`, Boolean(token(light, tone)));
  check(`dark theme defines --status-${tone}`, Boolean(token(dark, tone)));
  check(
    `light and dark --status-${tone} are different values`,
    Boolean(token(light, tone)) && token(light, tone) !== token(dark, tone),
    `both themes use ${token(light, tone)}`,
  );
}
check(
  '--status-accent is distinguishable from --status-neutral in both themes',
  token(light, 'accent') !== token(light, 'neutral') &&
    token(dark, 'accent') !== token(dark, 'neutral'),
  'accent and neutral share a value, so accent cannot tell a status apart',
);

/* -- result ------------------------------------------------------------ */
console.log('');
if (failures.length) {
  console.error(`${failures.length} check(s) FAILED:\n` + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('All status-mapping checks passed.');
#!/usr/bin/env node
/*
 * Active-platform rule — frontend guard.
 *
 * Mirrors the backend half of the rule (ActivePlatformRuleTest): a retired
 * platform (MT4) must be impossible to select for NEW account or application
 * creation, and the picker must still load for the roles that are allowed
 * onto those screens.
 *
 * Both failure modes guarded here were real regressions during this work:
 *  - ApplicationsDemo/Live originally hardcoded MT4/MT5 buttons and a
 *    hardcoded `platform: '1'` default, so MT4 was selectable with MT5 inactive.
 *  - Replacing that with an async list briefly allowed submitting an EMPTY
 *    platform, and the picker inherited `trading.view` — a permission the
 *    application screens do not require — so those forms could not load it.
 *
 * Run with:  node scripts/check-platform-rule.mjs   (or npm run check:platform)
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const failures = [];
const check = (label, ok, detail = '') => {
  if (ok) console.log(`  ok   ${label}`);
  else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
};

console.log('\nActive-platform rule (frontend)\n');

/* -- 1. No hardcoded MT4/MT5 choice buttons anywhere ------------------ */
const SCREENS = [
  'src/pages/Trading/ApplicationsDemo.vue',
  'src/pages/Trading/ApplicationsLive.vue',
  'src/components/trading/PlatformPicker.vue',
];
for (const f of SCREENS) {
  const src = read(f);
  check(
    `${f} has no hardcoded MT4 button`,
    !/platform-mt4["']/.test(src) && !/form\.platform\s*=\s*'1'/.test(src),
    'MT4 is directly selectable',
  );
  check(`${f} has no hardcoded default platform`, !/platform:\s*'1'/.test(src));
}

for (const f of [
  'src/components/trading/NewAccountDrawer.vue',
  'src/components/trading/DirectAccountDrawer.vue',
]) {
  check(`${f} requests ACTIVE platforms only`, /useTradingPlatforms\(true/.test(read(f)));
}

/* -- 2. The picker is driven by the shared, active-filtered reference -- */
const picker = read('src/components/trading/PlatformPicker.vue');
check(
  'PlatformPicker requests only ACTIVE platforms',
  /useTradingPlatforms\(true/.test(picker),
  'a retired platform could be offered',
);
check(
  'PlatformPicker exposes a `required` permission prop',
  /required\?:\s*string\s*\|\s*string\[\]/.test(picker),
);
check(
  'PlatformPicker hides platforms it cannot submit',
  /\.filter\(\(p\)\s*=>\s*Boolean\(LEGACY_VALUE\[p\.code\]\)\)/.test(picker),
  'an unmappable platform would render an always-failing option',
);

/* -- 3. Each application screen passes ITS OWN guard permission -------- */
const GUARDS = [
  ['src/pages/Trading/ApplicationsDemo.vue', 'trading.applications.demo.create'],
  ['src/pages/Trading/ApplicationsLive.vue', 'trading.applications.live.create'],
];
for (const [f, perm] of GUARDS) {
  const src = read(f);
  check(
    `${f} passes required="${perm}" to the picker`,
    new RegExp(`required="${perm.replace(/\./g, '\\.')}"`).test(src),
    "picker still inherits trading.view, which this route does not require",
  );
  check(
    `${f} cannot submit without a chosen platform`,
    /form\.platform\s*!==\s*''/.test(src),
    'an empty platform could be POSTed before the list loads',
  );
}

/* -- 4. The reference query is still permission-aware ----------------- */
const trading = read('src/queries/trading.ts');
check(
  'useTradingPlatforms accepts an explicit permission',
  /export function useTradingPlatforms\([\s\S]*?required:\s*string\s*\|\s*string\[\]/.test(trading),
);
check(
  'useTradingPlatforms still defaults to trading.view',
  /required:\s*string\s*\|\s*string\[\]\s*=\s*'trading\.view'/.test(trading),
);

console.log('');
if (failures.length) {
  console.error(`${failures.length} check(s) FAILED:\n` + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log('All active-platform checks passed.');
import { setTimeout as sleep } from 'node:timers/promises';
const CDP = 'http://127.0.0.1:9222';
const APP = 'http://127.0.0.1:5174';
const TOKEN = process.env.UAT_TOKEN;
const WALLET = process.env.WALLET_ID || '2';

const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
let net = []; let cons = [];
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); return; }
  if (m.method === 'Network.responseReceived') {
    const r = m.params.response;
    if (r.url.includes('/api/v1/') && r.status >= 400) net.push(`${r.status} ${r.url.split('/api/v1')[1]}`);
  }
  if (m.method === 'Runtime.exceptionThrown') cons.push('EXC ' + String(m.params.exceptionDetails?.exception?.description ?? '').split('\n')[0].slice(0, 120));
  if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'warning')) {
    const t = m.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 140);
    if (!/DevTools|Download the Vue/i.test(t)) cons.push(`${m.params.type.toUpperCase()} ${t}`);
  }
});
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { resolve: res, reject: rej })); };
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) return { __err: JSON.stringify(r.exceptionDetails).slice(0, 160) }; return r.result.value; };
async function waitFor(expr, t = 8000) { const s = Date.now(); while (Date.now() - s < t) { if (await ev(`!!(${expr})`)) return true; await sleep(120); } return false; }

await send('Page.enable'); await send('Runtime.enable'); await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('crm.token', ${JSON.stringify(TOKEN)});}catch(e){}` });

const ROUTES = [
  ['/', 'Home'], ['/settings/profile', 'Profile'], ['/settings/preferences', 'Preferences'], ['/settings/security', 'Security'],
  ['/leads', 'Leads'], ['/leads/inbox', 'Inbox'], ['/leads/pool', 'Public Sea'], ['/leads/pipeline', 'Pipeline'],
  ['/clients', 'Clients'], ['/mentions', 'Mentions'],
  ['/compliance/queue', 'KYC Queue'], ['/compliance/profiles', 'Profiles'], ['/compliance/document-types', 'Doc Types'],
  ['/trading/accounts', 'Accounts'], ['/trading/workspace', 'Trading Workspace'], ['/trading/requests', 'Requests'],
  ['/trading/applications', 'Applications'], ['/trading/applications/demo', 'Demo App'], ['/trading/applications/live', 'Live App'],
  ['/trading/platforms', 'Platforms'], ['/trading/groups', 'Groups'],
  ['/finance/dashboard', 'Finance Dash'], ['/finance/workspace', 'Finance WS'], ['/finance/transactions', 'Transactions'],
  ['/finance/deposits', 'Deposits'], ['/finance/withdrawals', 'Withdrawals'], ['/finance/ledger', 'Ledger'],
  [`/finance/wallets/${WALLET}`, 'Wallet'], ['/finance/payment-methods', 'Pay Methods'],
  ['/reports', 'Reports'], ['/reports/scheduled', 'Scheduled'], ['/reports/analytics', 'Analytics'],
  ['/admin/users', 'Users'], ['/admin/roles', 'Roles'], ['/admin/teams', 'Teams'], ['/admin/reference', 'Reference'], ['/admin/settings', 'Settings'],
];

const found = [];
for (const [path, label] of ROUTES) {
  net = []; cons = [];
  await send('Page.navigate', { url: APP + path });
  await waitFor(`document.querySelector('main')`, 7000);
  await sleep(2200);
  const info = await ev(`(()=>{const m=document.querySelector('main'); const h=m?.querySelector('h1')?.textContent?.trim()||''; const t=(m?.innerText||'').replace(/\\s+/g,' '); return {h, len:t.length, sample:t.slice(0,110), forbidden:/Access Denied|Not authorised|403|you do not have permission/i.test(t)};})()`);
  const uniqNet = [...new Set(net)]; const uniqCons = [...new Set(cons)];
  const bad = uniqNet.length || uniqCons.length || info.__err || info.len < 40;
  if (bad) found.push({ path, label, info, net: uniqNet, cons: uniqCons });
  console.log(`${bad ? '!' : ' '} ${label.padEnd(18)} ${path.padEnd(32)} h1="${info.h}" len=${info.len}${uniqNet.length ? ' NET:' + uniqNet.join(',') : ''}${uniqCons.length ? ' CONS:' + uniqCons.length : ''}`);
}
console.log('\n=== ROUTES WITH ISSUES ===');
for (const f of found) {
  console.log(`\n${f.path} (${f.label})`);
  if (f.info.__err) console.log('  eval err:', f.info.__err);
  console.log('  h1:', JSON.stringify(f.info.h), 'len:', f.info.len, 'forbidden:', f.info.forbidden);
  console.log('  sample:', JSON.stringify(f.info.sample));
  if (f.net.length) console.log('  failed API:', f.net.join(' | '));
  if (f.cons.length) console.log('  console:', f.cons.join(' | '));
}
ws.close(); process.exit(0);

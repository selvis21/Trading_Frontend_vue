import { setTimeout as sleep } from 'node:timers/promises';
const CDP = 'http://127.0.0.1:9222';
const APP = 'http://127.0.0.1:5174';
const TOKEN = process.env.UAT_TOKEN;

const targets = await (await fetch(`${CDP}/json`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
const send = (method, params = {}) => { const i = ++id; ws.send(JSON.stringify({ id: i, method, params })); return new Promise((res, rej) => pending.set(i, { resolve: res, reject: rej })); };
const ev = async (e) => { const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + JSON.stringify(r.exceptionDetails).slice(0, 200)); return r.result.value; };
async function waitFor(expr, t = 8000) { const s = Date.now(); while (Date.now() - s < t) { if (await ev(`!!(${expr})`)) return true; await sleep(120); } return false; }
async function box(expr) { return ev(`(()=>{const el=${expr}; if(!el) return null; el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),w:r.width,h:r.height};})()`); }
async function click(expr) { const b = await box(expr); if (!b || !b.w) throw new Error('no box ' + expr); await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 }); await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 }); await sleep(400); }
async function type(expr, text) { await evaluateFocus(expr); for (const ch of text) { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: ch, text: ch, unmodifiedText: ch }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch }); } }
async function evaluateFocus(expr) { await ev(`(()=>{const el=${expr}; el.focus(); el.value=''; el.dispatchEvent(new Event('input',{bubbles:true}));})()`); }
const byText = (sel, text) => `[...document.querySelectorAll(${JSON.stringify(sel)})].find(e => e.textContent.trim() === ${JSON.stringify(text)} && e.getBoundingClientRect().height > 0)`;

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('crm.token', ${JSON.stringify(TOKEN)});}catch(e){}` });

await send('Page.navigate', { url: APP + '/finance/dashboard' });
await waitFor(`${byText('button','New transaction')}`); await sleep(1200);

const clientIdInput = `document.querySelector('input[type=number][placeholder="e.g. 4821"]')`;
const pickerPresent = `[...document.querySelectorAll('button')].some(b=>b.textContent.includes('Search by name, email, mobile or client code'))`;

// --- New transaction drawer ---
await click(byText('button', 'New transaction')); await sleep(600);
const nt = {
  dialog: await ev(`!!document.querySelector('[role="dialog"]')`),
  rawClientIdInput: await ev(`!!${clientIdInput}`),
  searchablePicker: await ev(pickerPresent),
  labelText: await ev(`document.querySelector('[role="dialog"]')?.innerText.includes('Client ID')`),
};
console.log('New transaction drawer:', JSON.stringify(nt));
await click(`document.querySelector('button[aria-label="Close"]')`); await sleep(400);

// --- Transfer drawer ---
await click(byText('button', 'Transfer')); await sleep(600);
const tr = {
  dialog: await ev(`!!document.querySelector('[role="dialog"]')`),
  rawClientIdInput: await ev(`!!${clientIdInput}`),
  searchablePicker: await ev(pickerPresent),
};
console.log('Transfer drawer     :', JSON.stringify(tr));
await click(`document.querySelector('button[aria-label="Close"]')`); await sleep(400);

// --- Credit dialog: enter a valid amount, check submit enabled ---
await click(byText('button', 'Credit')); await sleep(600);
const amountInput = `document.querySelector('[role="dialog"] input[inputmode=decimal]')`;
if (await ev(`!!${amountInput}`)) await type(amountInput, '100');
await sleep(400);
const credit = {
  dialog: await ev(`!!document.querySelector('[role="dialog"]')`),
  amount: await ev(`(${amountInput})?.value`),
  submitDisabled: await ev(`(()=>{const b=${byText('button','Post adjustment')}; return b? b.disabled : 'no-button';})()`),
};
console.log('Credit dialog       :', JSON.stringify(credit));
ws.close(); process.exit(0);

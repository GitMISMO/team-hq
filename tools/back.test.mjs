// The browser's Back button in Team HQ (CN-033). Run on every change by .github/workflows/checks.yml:
//
//   npm i --no-save playwright-core@1.63.0 && node tools/back.test.mjs
//
// Opens the newest saved version as a Test Copy (?try=<version>) in headless Chrome, with a pretend sign-in
// and a pretend save relay holding made-up records, so nothing real is read or changed. MISMO's shared
// /assets/back.js is served from the live copy (MISMO_BACK=<file> tries a local copy instead).
// It checks: two menu pages and Back returns to the first; Forward goes again; Team HQ's own pages
// (Inbox, My Tasks) do the same; a record's panel is closed by Back and the page stays; a panel closed
// with its × leaves no extra step, so Back goes straight to the page before; no page errors.
// Exit code 1 if anything fails.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { chromium } = await import('playwright-core');

const versions = fs.readdirSync(path.join(ROOT, 'releases')).filter(f => /^upgrades-[0-9a-z]+\.js$/.test(f)).map(f => f.slice(9, -3)).sort();
const VER = process.env.HQ_VERSION || versions[versions.length - 1];

const SESSION = `window.ResourcesSession={current:()=>({email:'tester@example.org',name:'Kelly Bradshaw'}),
  token:()=>'t',canEdit:()=>true,role:()=>'user',requireAccess:()=>Promise.resolve(true),signIn:()=>Promise.resolve(),
  onChange:()=>{},require:()=>Promise.resolve(),ready:Promise.resolve()};`;
const STORE = {
  tasks: { docs: { t1: { id: 't1', t: 'Sample task', o: 'kelly', d: [], r: 'r1', w: '', s: 'Not Started', p: 'Normal', due: '', notes: '', rail: 0, ord: 10, at: 1 } } },
  rocks: { docs: { r1: { id: 'r1', name: 'Sample Project', status: 'Active', owner: 'kelly', lead: 'kelly', ws: [] } } },
};

let BACK = '';
if (process.env.MISMO_BACK) BACK = fs.readFileSync(process.env.MISMO_BACK, 'utf8');
else { const r = await fetch('https://resources.mismo.org/assets/back.js'); if (!r.ok) { console.log('::error::Could not read the live /assets/back.js (' + r.status + ')'); process.exit(1); } BACK = await r.text(); }

const TYPES = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let browser;
for (const o of [{ channel: 'chrome' }, { executablePath: process.env.CHROME || '/usr/bin/google-chrome' }, { executablePath: '/usr/bin/chromium' }]) {
  try { browser = await chromium.launch(o); break; } catch (e) {}
}
if (!browser) { console.log('::error::No Chrome to run the browser check in.'); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
/* the first-visit tour would cover the page */
await page.addInitScript(() => { try { localStorage.setItem('tools:team-hq:hq.tour.kelly', 'done'); } catch (e) {} });
page.on('pageerror', e => errs.push(process.env.HQ_STACK ? e.stack : e.message));
await page.route('**/*', async r => {
  const u = r.request().url();
  if (u.includes('/assets/session.js')) return r.fulfill({ contentType: 'application/javascript', body: SESSION });
  if (u.includes('/assets/back.js')) return r.fulfill({ contentType: 'application/javascript', body: BACK });
  if (u.includes('lambda-url')) {
    const name = decodeURIComponent((u.split('/data/')[1] || '').split('?')[0]);
    if (r.request().method() === 'GET') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: STORE[name] || null, sha: STORE[name] ? 's0' : undefined }) });
    return r.fulfill({ contentType: 'application/json', body: '{"sha":"s1"}' });
  }
  if (u.startsWith('http://hq.test/team-hq/')) {
    const f = new URL(u).pathname.slice('/team-hq/'.length) || 'index.html';
    const fp = path.join(ROOT, f);
    if (fp.startsWith(ROOT + path.sep) && fs.existsSync(fp) && fs.statSync(fp).isFile())
      return r.fulfill({ body: fs.readFileSync(fp), contentType: TYPES[path.extname(f)] || 'application/octet-stream' });
    return r.fulfill({ status: 404, body: '' });
  }
  return r.abort();
});

let failed = 0;
const pass = m => console.log('ok   ' + m);
const fail = m => { failed++; console.log('::error::' + m); };
const expect = (c, m, why) => c ? pass(m) : fail(m + (why ? ' (' + why + ')' : ''));
const wait = ms => page.waitForTimeout(ms);
const where = () => page.evaluate(() => { const b = document.querySelector('nav button[data-hq][aria-current], [data-back-page][aria-current]'); return b ? (b.dataset.hq || b.dataset.backPage) : ''; });
const panelOpen = () => page.evaluate(() => !document.getElementById('panel').classList.contains('off'));
const click = async sel => { await page.click(sel); await wait(700); };
const back = async () => { await page.goBack({ waitUntil: 'commit' }).catch(() => {}); await wait(900); };
const fwd = async () => { await page.goForward({ waitUntil: 'commit' }).catch(() => {}); await wait(900); };

try {
  await page.goto('http://hq.test/team-hq/?try=' + VER);
  await page.waitForFunction(() => window.MismoBack && window.__nx && !document.querySelector('.hq-bootscreen, #hq-boot') && document.querySelector('nav button[data-hq="dates"]'), null, { timeout: 30000 }).catch(() => {});
  await wait(12000); /* the opening cover, then back.js settles on the opening page */
  console.log('Checking version ' + VER + ' with back.js ' + (await page.evaluate(() => window.MismoBack && window.MismoBack.version)));
  expect(await page.evaluate(() => !!window.MismoBack), 'the shared back.js is loaded');
  expect(await where() === 'day', 'Team HQ opens on My Dashboard', 'on ' + await where());

  // Two menu pages, Back returns to the first, Forward goes again
  await click('nav button[data-hq="dates"]');
  await click('nav button[data-hq="plans"]');
  expect(await where() === 'plans', 'the menu opens Plans', 'on ' + await where());
  await back();
  expect(await where() === 'dates', 'Back from Plans returns to Key Dates', 'on ' + await where());
  await fwd();
  expect(await where() === 'plans', 'Forward goes to Plans again', 'on ' + await where());

  // Team HQ's own pages (drawn by next.js) are steps too
  await click('nav button[data-nx="inbox"]');
  await click('nav button[data-nx="mine"]');
  await back();
  expect(await where() === 'inbox', 'Back from My Tasks returns to Inbox', 'on ' + await where());
  await back();
  expect(await where() === 'plans', 'Back from Inbox returns to Plans', 'on ' + await where());

  // A record's panel: Back closes it and stays on the page
  await click('#newtask');
  expect(await panelOpen(), 'New Task opens its panel');
  await back();
  expect(!(await panelOpen()) && await where() === 'plans', 'Back closes the panel and stays on Plans', 'panel ' + (await panelOpen() ? 'open' : 'closed') + ', on ' + await where());

  // Closed with its ×: Back goes straight to the page before
  await click('#newtask');
  await click('#panel-x');
  expect(!(await panelOpen()), 'the × closes the panel');
  await back();
  expect(await where() === 'dates', 'after closing with ×, Back goes straight to Key Dates', 'on ' + await where());

  // Help in the menu foot is a page too
  await click('#help-btn');
  expect(await where() === 'help', 'Help opens and is marked', 'on ' + await where());
  await back();
  expect(await where() === 'dates', 'Back from Help returns to Key Dates', 'on ' + await where());

  // A project's panel on Team Projects
  await click('nav button[data-hq="rocks"]');
  const pv2 = () => page.evaluate(() => !!document.querySelector('.pv2-panel.on') || !document.getElementById('panel').classList.contains('off'));
  const card = page.locator('.pv2-card, .pv2-sr, .pv2-tn, td.nm').filter({ hasText: 'Sample Project' }).first();
  if (!(await card.count())) fail('no project to open on Team Projects');
  else {
    await card.click(); await wait(700);
    expect(await pv2(), 'a project opens its panel');
    await back();
    expect(!(await pv2()) && await where() === 'rocks', 'Back closes the project panel and stays on Team Projects', 'on ' + await where());
    await back();
    expect(await where() === 'dates', 'Back from Team Projects returns to Key Dates', 'on ' + await where());
  }

  expect(!errs.length, 'no page errors', errs.join(' | '));
} catch (e) {
  fail('the Back check stopped: ' + e.message);
}
await browser.close();
console.log(failed ? failed + ' problem' + (failed > 1 ? 's' : '') + '.' : 'No problems.');
process.exit(failed ? 1 : 0);

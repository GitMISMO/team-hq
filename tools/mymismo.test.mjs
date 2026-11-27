// MyMISMO's team area moved out of Team HQ (CN-062, Nov 27, 2026). Run on every change by .github/workflows/checks.yml:
//
//   npm i --no-save playwright-core@1.63.0 && node tools/mymismo.test.mjs
//
// Attendee Reports and MISMO Trivia now live in MISMO Media (CN-061). This opens the newest saved version as a Test Copy
// (?try=<version>) in headless Chrome with a pretend sign-in and a pretend save relay in which MyMISMO's staff routes
// answer 200 with made-up reports and trivia, and checks Team HQ ignores them: it never calls those routes, there is no
// MyMISMO menu item, My Dashboard and On Your Plate say nothing about attendee reports, an old ?page=reports link opens
// My Dashboard, and the MyMISMO tile is still in + Add a Tile. No page errors. Exit code 1 if anything fails.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const { chromium } = await import('playwright-core');

const versions = fs.readdirSync(path.join(ROOT, 'releases')).filter(f => /^upgrades-[0-9a-z]+\.js$/.test(f)).map(f => f.slice(9, -3)).sort();
const VER = process.env.HQ_VERSION || versions[versions.length - 1];

const SESSION = `window.ResourcesSession={current:()=>({email:'tester@example.org',name:'Kelly Bradshaw'}),
  token:()=>'t',canEdit:()=>true,role:()=>'user',requireAccess:()=>Promise.resolve(true),signIn:()=>Promise.resolve(),
  onChange:()=>{},require:()=>Promise.resolve(),ready:Promise.resolve()};`;
const REPORTS = { open: 2, reports: [
  { summit: 'fall-2026', id: 'RP1a', about: 'A1', aboutName: 'Pat Example', byName: 'Sam Sample', reason: 'harassment', note: 'Made-up note one', at: new Date(Date.now() - 36e5).toISOString(), status: 'open', action: '' },
  { summit: 'fall-2026', id: 'RP1b', about: 'A2', aboutName: 'Lee Madeup', byName: 'Kim Pretend', reason: 'spam', note: '', at: new Date(Date.now() - 864e5).toISOString(), status: 'open', action: '' },
  { summit: 'spring-2026', id: 'RP1c', about: 'A3', aboutName: 'Ray Test', byName: 'Jo Trial', reason: 'other', note: 'Old one', at: '2026-04-02T15:00:00Z', status: 'closed', action: 'Spoke with them' },
] };
const TRIVIA = { month: '2026-11', quarter: '2026-Q4', boards: [{ month: '2026-11', players: 3, top: [{ rank: 1, name: 'Pat Example', score: 900, right: 9 }] }], quarters: [], champ: null };

let browser;
for (const o of [{ channel: 'chrome' }, { executablePath: process.env.CHROME || '/usr/bin/google-chrome' }, { executablePath: '/usr/bin/chromium' }]) {
  try { browser = await chromium.launch(o); break; } catch (e) {}
}
if (!browser) { console.log('::error::No Chrome to run the browser check in.'); process.exit(1); }
const TYPES = { '.js': 'application/javascript', '.html': 'text/html', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

let failed = 0;
const pass = m => console.log('ok   ' + m);
const fail = m => { failed++; console.log('::error::' + m); };
const expect = (c, m, why) => c ? pass(m) : fail(m + (why ? ' (' + why + ')' : ''));

async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [], calls = [];
  await page.addInitScript(() => { try { localStorage.setItem('tools:team-hq:hq.tour.kelly', 'done'); } catch (e) {} });
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', async r => {
    const u = r.request().url(), m = r.request().method();
    if (u.includes('/assets/session.js')) return r.fulfill({ contentType: 'application/javascript', body: SESSION });
    if (u.includes('/assets/back.js')) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (u.includes('lambda-url') && u.includes('/mymismo/staff/')) {
      calls.push(m + ' ' + u);
      return r.fulfill({ contentType: 'application/json', body: JSON.stringify(u.includes('/trivia') ? TRIVIA : REPORTS) });
    }
    if (u.includes('lambda-url')) {
      if (m === 'GET') return r.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: null }) });
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
  await page.goto('http://hq.test/team-hq/?try=' + VER + (query || ''));
  await page.waitForFunction(() => window.__nx && document.querySelector('nav button[data-nx="day"]'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(12000);
  return { page, errs, calls };
}
const text = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);

try {
  console.log('Checking version ' + VER);
  {
    const { page, errs, calls } = await open('');
    expect(!(await page.$('nav button[data-nx="mymismo"]')), 'there is no MyMISMO menu item');
    expect(!/attendee report/i.test(await text(page, '.nx-hero')), 'My Dashboard says nothing about attendee reports');
    expect(!/attendee report/i.test(await text(page, '.nx-needs')), 'On Your Plate says nothing about attendee reports');
    expect(!calls.length, 'Team HQ never calls MyMISMO\'s staff routes', calls.join(', '));
    expect(!errs.length, 'no page errors', errs.join(' | '));
    await page.close();
  }
  {
    const { page, errs } = await open('&page=reports');
    expect(!!(await page.$('nav button[data-nx="day"][aria-current="page"]')), 'an old ?page=reports link opens My Dashboard');
    expect(!errs.length, 'with ?page=reports, no page errors', errs.join(' | '));
    await page.close();
  }
  const rel = fs.readFileSync(path.join(ROOT, 'releases', 'upgrades-' + VER + '.js'), 'utf8');
  expect(/\['mymismo','MyMISMO','\/mymismo\/'/.test(rel), 'the MyMISMO tile is still in + Add a Tile');
} catch (e) {
  fail('the MyMISMO check stopped: ' + e.message);
}
await browser.close();
console.log(failed ? failed + ' problem' + (failed > 1 ? 's' : '') + '.' : 'No problems.');
process.exit(failed ? 1 : 0);

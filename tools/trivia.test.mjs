// MyMISMO's MISMO Trivia in Team HQ (CN-043). Run on every change by .github/workflows/checks.yml:
//
//   npm i --no-save playwright-core@1.63.0 && node tools/trivia.test.mjs
//
// Opens the newest saved version as a Test Copy (?try=<version>) in headless Chrome, with a pretend sign-in and a
// pretend save relay, so nothing real is read or changed. Twice:
//  1. MyMISMO's trivia and reports routes answer 403 (not one of its alert senders): no MyMISMO menu item.
//  2. Trivia answers 200 with made-up players (reports still 403): MyMISMO is in the menu and opens MISMO Trivia with each
//     finished month's winner, the top 10, this quarter's finalists, last quarter's standings and the championship form;
//     the form refuses closing before opening, and the Test Copy sends nothing. No page errors either time.
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

const TRIVIA = { month: '2026-11', quarter: '2026-Q4',
  boards: [
    { month: '2026-11', players: 14, top: [{ rank: 1, name: 'Kim P.', score: 15200, right: 9 }, { rank: 2, name: 'Lee M.', score: 14100, right: 8 }] },
    { month: '2026-10', players: 22, top: Array.from({ length: 10 }, (_, i) => ({ rank: i + 1, name: (i ? 'Player ' + i : 'Pat E.'), score: 17000 - i * 700, right: 10 - Math.floor(i / 2) })) },
    { month: '2026-09', players: 9, top: [{ rank: 1, name: 'Sam S.', score: 16000, right: 9 }] },
    { month: '2026-08', players: 0, top: [] } ],
  quarters: [
    { quarter: '2026-Q4', finalists: [{ name: 'Pat E.', month: '2026-10' }], standings: null },
    { quarter: '2026-Q3', finalists: [{ name: 'Sam S.', month: '2026-09' }, { name: 'Ray T.', month: '2026-08' }, { name: 'Jo T.', month: '2026-07' }],
      standings: [{ name: 'Ray T.', total: 9000, played: true }, { name: 'Sam S.', total: 12000, played: true }, { name: 'Jo T.', total: 0, played: false }] } ],
  champ: { quarter: '2026-Q3', opens: '2026-10-06T13:00:00Z', closes: '2026-10-13T04:00:00Z', minutes: 15, open: false } };

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

async function open(answer) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [], posts = [];
  await page.addInitScript(() => { try { localStorage.setItem('tools:team-hq:hq.tour.kelly', 'done'); } catch (e) {} });
  page.on('pageerror', e => errs.push(e.message));
  await page.route('**/*', async r => {
    const u = r.request().url(), m = r.request().method();
    if (u.includes('/assets/session.js')) return r.fulfill({ contentType: 'application/javascript', body: SESSION });
    if (u.includes('/assets/back.js')) return r.fulfill({ contentType: 'application/javascript', body: '' });
    if (u.includes('lambda-url') && u.includes('/mymismo/staff/reports'))
      return r.fulfill({ status: 403, contentType: 'application/json', body: '{"error":"NOT_ALLOWED"}' });
    if (u.includes('lambda-url') && u.includes('/mymismo/staff/trivia')) {
      if (m === 'POST') { posts.push(u); return r.fulfill({ contentType: 'application/json', body: '{"ok":true,"champ":null}' }); }
      return answer === 200 ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(TRIVIA) })
        : r.fulfill({ status: answer, contentType: 'application/json', body: '{"error":"NOT_ALLOWED"}' });
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
  await page.goto('http://hq.test/team-hq/?try=' + VER);
  await page.waitForFunction(() => window.__nx && document.querySelector('nav button[data-nx="day"]'), null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(12000);
  return { page, errs, posts };
}
const text = (page, sel) => page.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText : ''; }, sel);

try {
  console.log('Checking version ' + VER);
  { // 1. not let in
    const { page, errs } = await open(403);
    expect(!(await page.$('nav button[data-nx="mymismo"]')), 'with a 403, there is no MyMISMO menu item');
    expect(!(await page.$('.tv')), 'with a 403, no MISMO Trivia anywhere');
    expect(!errs.length, 'with a 403, no page errors', errs.join(' | '));
    await page.close();
  }
  { // 2. let in
    const { page, errs, posts } = await open(200);
    expect(!!(await page.$('nav button[data-nx="mymismo"]')), 'with a 200, MyMISMO is in the menu');
    await page.click('nav button[data-nx="mymismo"]'); await page.waitForTimeout(800);
    const pg = await text(page, '.tv');
    expect(!!(await page.$('.nx-mmb.on:has-text("MISMO Trivia")')) && !(await page.$('.nx-mmb:has-text("Attendee Reports")')),
      'MyMISMO opens on MISMO Trivia, with no Attendee Reports tab when that route says no');
    expect(/October 2026[\s\S]*Pat E\./i.test(await text(page, '.tv-wins')) && /September 2026[\s\S]*Sam S\./i.test(await text(page, '.tv-wins')),
      'Monthly Winners shows each finished month’s #1', (await text(page, '.tv-wins')).slice(0, 200));
    expect(!/November 2026/i.test(await text(page, '.tv-wins')), 'this month has no winner yet');
    const oct = await page.$$eval('.tv-board', els => { const e = els.find(x => /October 2026/.test(x.innerText)); return e ? e.querySelectorAll('tbody tr').length : 0; });
    expect(oct === 10, 'October’s board lists its top 10', String(oct));
    const qs = await text(page, '.tv-qs');
    expect(/Q4 2026 Championship[\s\S]*Pat E\.[\s\S]*October 2026 winner/.test(qs) && /Not played yet/.test(qs), 'this quarter’s finalists so far, not played yet', qs.slice(0, 300));
    expect(/Q3 2026 Championship[\s\S]*1\s+Sam S\.\s+12,000[\s\S]*Hasn’t played/.test(qs), 'last quarter’s standings, highest total first', qs.slice(0, 400));
    expect(/Q3 2026: opens/.test(await text(page, '.tv-set')) && /15 minutes/.test(await text(page, '.tv-set')), 'the championship that is set is shown');
    await page.fill('.tv-form label:has-text("Opens") input', '2027-01-10T09:00');
    await page.fill('.tv-form label:has-text("Closes") input', '2027-01-05T09:00');
    await page.click('.tv-form .tv-btn.pri'); await page.waitForTimeout(400);
    expect(/close after it opens/.test(await text(page, '.tv-set')), 'closing before opening is refused');
    await page.fill('.tv-form label:has-text("Closes") input', '2027-01-17T21:00');
    await page.selectOption('.tv-form select', '2026-Q4');
    await page.click('.tv-form .tv-btn.pri'); await page.waitForTimeout(800);
    expect(!posts.length, 'the Test Copy sends nothing', posts.join(', '));
    expect(!pg.includes('undefined') && !pg.includes('NaN'), 'no broken values on the page');
    expect(!errs.length, 'with a 200, no page errors', errs.join(' | '));
    await page.close();
  }
} catch (e) {
  fail('the MISMO Trivia check stopped: ' + e.message);
}
await browser.close();
console.log(failed ? failed + ' problem' + (failed > 1 ? 's' : '') + '.' : 'No problems.');
process.exit(failed ? 1 : 0);

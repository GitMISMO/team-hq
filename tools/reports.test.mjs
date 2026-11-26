// MyMISMO Attendee Reports in Team HQ (CN-041). Run on every change by .github/workflows/checks.yml:
//
//   npm i --no-save playwright-core@1.63.0 && node tools/reports.test.mjs
//
// Opens the newest saved version as a Test Copy (?try=<version>) in headless Chrome, with a pretend sign-in and a
// pretend save relay, so nothing real is read or changed. Twice:
//  1. MyMISMO's route answers 403 (not one of its alert senders): no Attendee Reports menu item, no count anywhere.
//  2. It answers 200 with made-up reports: the menu item, the open count on My Dashboard (its top line and On Your
//     Plate), the page lists each report (summit, who it's about, who sent it, reason, note, when), Close needs a note
//     of what was done, and the Test Copy sends nothing. No page errors either time.
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
const REPORTS = { open: 2, reports: [
  { summit: 'fall-2026', id: 'RP1a', about: 'A1', aboutName: 'Pat Example', byName: 'Sam Sample', reason: 'harassment', note: 'Made-up note one', at: new Date(Date.now() - 36e5).toISOString(), status: 'open', action: '' },
  { summit: 'fall-2026', id: 'RP1b', about: 'A2', aboutName: 'Lee Madeup', byName: 'Kim Pretend', reason: 'spam', note: '', at: new Date(Date.now() - 864e5).toISOString(), status: 'open', action: '' },
  { summit: 'spring-2026', id: 'RP1c', about: 'A3', aboutName: 'Ray Test', byName: 'Jo Trial', reason: 'other', note: 'Old one', at: '2026-04-02T15:00:00Z', status: 'closed', action: 'Spoke with them' },
] };

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
    if (u.includes('lambda-url') && u.includes('/mymismo/staff/reports')) {
      if (m === 'POST') { posts.push(u); return r.fulfill({ contentType: 'application/json', body: '{"ok":true}' }); }
      return answer === 200 ? r.fulfill({ contentType: 'application/json', body: JSON.stringify(REPORTS) })
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
    expect(!(await page.$('nav button[data-nx="reports"]')), 'with a 403, there is no Attendee Reports menu item');
    expect(!/attendee report/i.test(await text(page, '.nx-hero')), 'with a 403, My Dashboard says nothing about reports');
    expect(!errs.length, 'with a 403, no page errors', errs.join(' | '));
    await page.close();
  }
  { // 2. let in
    const { page, errs, posts } = await open(200);
    expect(!!(await page.$('nav button[data-nx="reports"]')), 'with a 200, Attendee Reports is in the menu');
    const hero = await text(page, '.nx-hero');
    expect(/2 MyMISMO attendee reports are open/.test(hero), 'My Dashboard says 2 attendee reports are open', hero.slice(0, 200));
    expect(/2 Open Attendee Reports/.test(await text(page, '.nx-needs')), 'On Your Plate lists the open reports');
    await page.click('.nx-needs .nx-need:has-text("Open Attendee Reports")'); await page.waitForTimeout(700);
    const pg = await text(page, '.ar');
    expect(/Pat Example/.test(pg) && /Sam Sample/.test(pg) && /fall-2026/.test(pg) && /Harassment/.test(pg) && /Made-up note one/.test(pg) && /Today|Yesterday|ago|\d/.test(pg),
      'the page shows the summit, who it is about, who sent it, the reason, the note and when', pg.slice(0, 300));
    expect(!/Ray Test/.test(pg), 'the closed report is not in the open list');
    await page.click('.ar-row:has-text("Pat Example") .ar-btn.pri'); await page.waitForTimeout(400);
    expect(!!(await page.$('.ar-close input')), 'Close… asks what was done');
    await page.click('.ar-close .ar-btn.pri'); await page.waitForTimeout(400);
    expect(!!(await page.$('.ar-close input.need')), 'Close Report needs a note of what was done');
    await page.fill('.ar-close input', 'Spoke with the attendee');
    await page.click('.ar-close .ar-btn.pri'); await page.waitForTimeout(800);
    expect(!posts.length, 'the Test Copy sends nothing', posts.join(', '));
    await page.click('.ar-fig:has-text("Closed")'); await page.waitForTimeout(400);
    const cl = await text(page, '.ar');
    expect(/Ray Test/.test(cl) && /Spoke with them/.test(cl) && /Reopen/.test(cl), 'Closed lists the closed report with what was done and Reopen');
    expect(!errs.length, 'with a 200, no page errors', errs.join(' | '));
    await page.close();
  }
} catch (e) {
  fail('the Attendee Reports check stopped: ' + e.message);
}
await browser.close();
console.log(failed ? failed + ' problem' + (failed > 1 ? 's' : '') + '.' : 'No problems.');
process.exit(failed ? 1 : 0);

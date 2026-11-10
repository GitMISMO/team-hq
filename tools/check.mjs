// Team HQ's automatic checks. Run on every change (.github/workflows/checks.yml) and
// before a version goes live (.github/workflows/publish.yml runs it with --publish <version>).
//
//   node tools/check.mjs                      every change: the newest saved version and the source
//   node tools/check.mjs --publish 20261109b  before publishing that version
//
// A problem fails the check (exit 1) and stops a version from going live.
// A warning is shown on the run but does not stop anything.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import os from 'node:os';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const publishVer = args[0] === '--publish' ? args[1] : null;
let problems = 0, warnings = 0;
const bad = (msg, file) => { problems++; console.log('::error' + (file ? ' file=' + file : '') + '::' + msg); };
const warn = (msg, file) => { warnings++; console.log('::warning' + (file ? ' file=' + file : '') + '::' + msg); };
const ok = msg => console.log('ok   ' + msg);
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));

// 1. Which version are we checking?
const releases = fs.readdirSync(path.join(ROOT, 'releases')).filter(f => /^upgrades-[0-9a-z]+\.js$/.test(f))
  .map(f => f.slice(9, -3)).sort();
const newest = releases[releases.length - 1];
const ver = publishVer || newest;
if (publishVer && !/^[0-9a-z]+$/.test(publishVer)) { bad('Version names are letters and numbers only.'); finish(); }
if (!releases.includes(ver)) { bad('No saved version ' + ver + ' in releases/.'); finish(); }
const relFile = 'releases/upgrades-' + ver + '.js';
const rel = read(relFile);
console.log('Checking version ' + ver + (publishVer ? ' before it goes live' : ' (the newest saved version)'));

// 2. The version's script parses, and says inside which version it is.
const parses = (code, name) => { try { new vm.Script(code, { filename: name }); return true; } catch (e) { bad('Does not parse: ' + e.message, name); return false; } };
if (parses(rel, relFile)) ok(relFile + ' parses');
if (rel.includes("var BUILD='" + ver + "';")) ok(relFile + ' says it is version ' + ver);
else bad(relFile + ' is not version ' + ver + ' inside (its BUILD line is different).', relFile);

// 3. Nothing that looks like a key, token or password anywhere we publish.
const SECRET = [/ghp_[A-Za-z0-9]{30,}/, /github_pat_[A-Za-z0-9_]{40,}/, /gho_[A-Za-z0-9]{30,}/, /AKIA[0-9A-Z]{16}/,
  /sk-ant-[A-Za-z0-9_-]{20,}/, /xox[bpas]-[A-Za-z0-9-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /[?&]sig=[A-Za-z0-9%_-]{20,}/ /* a signed Power Automate trigger URL */];
const scan = [relFile, 'index.html', 'upgrades.js', 'build.py', 'README.md', 'DEVELOPING.md', 'CHANGELOG.md']
  .concat(exists('src') ? fs.readdirSync(path.join(ROOT, 'src')).map(f => 'src/' + f) : []).filter(exists);
let leaks = 0;
for (const f of scan) { const t = read(f); for (const re of SECRET) { const m = t.match(re); if (m) { leaks++; bad('Looks like a key or token (' + m[0].slice(0, 8) + '…). Keys never go in this repository.', f); } } }
if (!leaks) ok('no keys or tokens in ' + scan.length + ' files');

// 4. The Test Copy must hold back every save, and the live page must load the live file.
if (exists('index.html')) {
  const ix = read('index.html');
  if (/__HQ_TRY/.test(ix) && /__HQ_TEST\s*=\s*true/.test(ix)) ok('index.html still holds back saves in the Test Copy');
  else bad('index.html no longer sets up the Test Copy (__HQ_TRY / __HQ_TEST), so a Test Copy could save for real.', 'index.html');
  const live = (ix.match(/upgrades\.js\?v=([0-9a-z]+)/) || [])[1];
  if (exists('upgrades.js') && live) {
    if (read('upgrades.js').includes("var BUILD='" + live + "';")) ok('the live page and upgrades.js are both version ' + live);
    else bad('index.html loads version ' + live + ' but upgrades.js is a different version. Run Publish a Version again.', 'index.html');
  }
  if (!/http-equiv=["']Content-Security-Policy["']/i.test(ix)) warn('index.html has no page safety list (Content-Security-Policy) yet.', 'index.html');
  else ok('index.html has a page safety list');
}

// 5. The source in src/ builds this exact version. Every change is checked; publishing the newest
//    version requires it, so what goes live is always what's in src/.
if (exists('build.py') && exists('src')) {
  let partsOk = true;
  for (const f of fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js') && !/^frame-/.test(f))) {
    try { new vm.Script('(function(){\n' + read('src/' + f) + '\n})', { filename: 'src/' + f }); }
    catch (e) { partsOk = false; bad('Does not parse on its own: ' + e.message, 'src/' + f); }
  }
  if (partsOk) ok('every source file parses on its own');
  if (ver === newest) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hq-'));
    let built = null;
    try {
      const code = "import sys,importlib.util as u\ns=u.spec_from_file_location('b',sys.argv[1]);m=u.module_from_spec(s);s.loader.exec_module(m)\nopen(sys.argv[3],'w',encoding='utf-8').write(m.build(sys.argv[2]))";
      execFileSync('python3', ['-c', code, path.join(ROOT, 'build.py'), ver, path.join(tmp, 'out.js')]);
      built = fs.readFileSync(path.join(tmp, 'out.js'), 'utf8');
    } catch (e) { bad('build.py failed: ' + e.message, 'build.py'); }
    if (built !== null) {
      if (built === rel) ok('src/ builds version ' + ver + ' exactly');
      else {
        const msg = 'src/ does not build ' + relFile + ' exactly. Upload the changed source files with the release.';
        if (publishVer) bad(msg, relFile); else warn(msg + ' (Publishing this version will be refused until it does.)', relFile);
      }
    }
  } else ok('version ' + ver + ' is an earlier version (a roll back), so it is not rebuilt from today\'s source');
}

// 6. The change log is kept.
if (!exists('CHANGELOG.md')) bad('CHANGELOG.md is missing.');
else ok('CHANGELOG.md is here');

finish();
function finish() {
  console.log((problems ? problems + ' problem' + (problems > 1 ? 's' : '') : 'No problems') + (warnings ? ', ' + warnings + ' warning' + (warnings > 1 ? 's' : '') : '') + '.');
  process.exit(problems ? 1 : 0);
}

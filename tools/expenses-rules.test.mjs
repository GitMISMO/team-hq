// Tests for the rules in src/expenses.js (the part between /*LOGIC>*/ and /*<LOGIC*/), on made-up records.
// Run: node tools/expenses-rules.test.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../src/expenses.js', import.meta.url), 'utf8');
const a = src.indexOf('/*LOGIC>*/'), b = src.indexOf('/*<LOGIC*/');
assert.ok(a > 0 && b > a, 'the rules block is marked in src/expenses.js');
const X = new Function(src.slice(a, b) + '\nreturn X;')();

let n = 0;
const t = (name, fn) => { fn(); n++; console.log('ok', n, name); };
const ex = (o) => Object.assign({ id: 'ex-' + Math.random().toString(36).slice(2, 8), who: 'amy', by: 'amy', trip: '', cat: '', date: '', name: '', amt: '', rcptAmt: '', receipt: 0, asset: '', submitted: 0, notes: '', at: Date.now() }, o);

t('IRS mileage rates by date', () => {
  assert.equal(X.rateFor('2026-07-01'), 0.76);
  assert.equal(X.rateFor('2026-06-30'), 0.725);
  assert.equal(X.rateFor('2026-01-01'), 0.725);
  assert.equal(X.rateFor('2025-12-31'), 0.70);
  assert.equal(X.rateFor('2024-05-01'), 0.67);
  assert.equal(X.mileAmt(42, '2026-11-13'), 31.92);
  assert.equal(X.mileAmt(10.5, '2026-03-01'), 7.61);
  assert.equal(X.rateTxt(0.725), '$0.725');
  assert.equal(X.rateTxt(0.76), '$0.76');
});

t('mileage line in the notes, and reading miles back', () => {
  const n1 = X.withMileLine('Client visit', 42, '2026-11-13');
  assert.equal(n1, 'Mileage: 42 miles at $0.76 a mile (IRS rate)\nClient visit');
  const n2 = X.withMileLine(n1, 50, '2026-11-13');
  assert.equal(n2, 'Mileage: 50 miles at $0.76 a mile (IRS rate)\nClient visit');
  assert.equal(X.withMileLine(n2, 0, '2026-11-13'), 'Client visit');
  const html = X.withMileLine('<div>Mileage: 12 miles at $0.76 a mile (IRS rate)</div><div>Dulles</div>', 20, '2026-11-13');
  assert.equal(html, 'Mileage: 20 miles at $0.76 a mile (IRS rate)<br><div>Dulles</div>');
  assert.equal(X.milesOf({ notes: n1 }), 42);
  assert.equal(X.milesOf({ miles: 7, notes: n1 }), 7);
});

t('policy: receipts at $15 or more, never for mileage', () => {
  assert.deepEqual(X.checks(ex({ cat: 'Parking', amt: '14.99' }), []).map(c => c.k), []);
  assert.deepEqual(X.checks(ex({ cat: 'Parking', amt: '15' }), []).map(c => c.k), ['rcpt']);
  assert.deepEqual(X.checks(ex({ cat: 'Parking', amt: '15', asset: 'receipts/x.jpg' }), []).map(c => c.k), []);
  assert.deepEqual(X.checks(ex({ cat: 'Parking', amt: '15', rcptPending: 'rq-1' }), []).map(c => c.k), []);
  assert.deepEqual(X.checks(ex({ cat: 'Mileage', amt: '120.00' }), []).map(c => c.k), []);
});

t('policy: meal guidelines and the $140 day', () => {
  const day = '2026-11-12';
  const b = ex({ cat: 'Meal Trvl - Breakfast', amt: '25.00', date: day, asset: 'r' });
  const l = ex({ cat: 'Meal Trvl - Lunch', amt: '40.01', date: day, asset: 'r' });
  const d = ex({ cat: 'Meal Trvl - Dinner', amt: '60.00', date: day, asset: 'r' });
  const s = ex({ cat: 'Meal Trvl - Snack', amt: '15.00', date: day, asset: 'r' });
  const all = [b, l, d, s];
  assert.deepEqual(X.checks(b, all).map(c => c.k), ['day']);            // 140.01 for the day
  assert.deepEqual(X.checks(l, all).map(c => c.k), ['meal', 'day']);
  assert.deepEqual(X.checks(s, all).map(c => c.k), ['day']);            // a $15 snack is at, not over, the guideline
  const other = ex({ who: 'perry', cat: 'Meal Trvl - Dinner', amt: '90', date: day, asset: 'r' });
  assert.deepEqual(X.checks(b, [b, other]).map(c => c.k), []);          // someone else's meals don't count
  const noRcpt = ex({ cat: 'Meal Trvl - Snack', amt: '15', date: day });
  assert.equal(X.worst(noRcpt, [noRcpt]), 'bad');
});

t('policy: receipt amount that does not match', () => {
  assert.deepEqual(X.checks(ex({ cat: 'Taxi/Uber/Lyft', amt: '30', rcptAmt: '25', asset: 'r' }), []).map(c => c.k), ['diff']);
});

t('what is still missing', () => {
  assert.deepEqual(X.missing(ex({})), ['Expense Name', 'Expense Type', 'Amount', 'Expense Date']);
  assert.deepEqual(X.missing(ex({ name: 'Uber', cat: 'Taxi/Uber/Lyft', amt: '12', date: '2026-11-12' })), []);
});

t('trip states: adding, sent, reopened, entered', () => {
  const T = 'DC Team Meeting';
  const a1 = ex({ trip: T, date: '2026-11-11', amt: '10' }), a2 = ex({ trip: T, date: '2026-11-13', amt: '5' });
  assert.equal(X.tripOf([a1, a2], 'amy', T).state, 'adding');
  a1.done = a2.done = 1000;
  assert.equal(X.tripOf([a1, a2], 'amy', T).state, 'sent');
  const a3 = ex({ trip: T, date: '2026-11-14', amt: '7' });
  const st = X.tripOf([a1, a2, a3], 'amy', T);
  assert.equal(st.state, 'reopened'); assert.equal(st.fresh.length, 1); assert.equal(st.sum, 22);
  [a1, a2, a3].forEach(x => x.submitted = 1);
  const en = X.tripOf([a1, a2, a3], 'amy', T);
  assert.equal(en.state, 'entered'); assert.equal(en.total, 22); assert.equal(en.sum, 0);
});

t('who enters whose', () => {
  assert.equal(X.procOf('amy'), 'vanessa'); assert.equal(X.procOf('perry'), 'vanessa');
  assert.equal(X.procOf('jonathan'), 'jonna'); assert.equal(X.procOf('jonna'), 'jonna');
  assert.equal(X.selfFin('jonna'), true); assert.equal(X.selfFin('vanessa'), false);
  assert.equal(X.entersOwn('vanessa'), true); assert.equal(X.entersOwn('jonna'), false); assert.equal(X.entersOwn('amy'), false);
});

t('a receipt joins the person\'s own trip within 3 days', () => {
  const mine = ex({ trip: 'DC Trip', date: '2026-11-12' });
  const old = ex({ trip: 'Executive Women\'s Summit', date: '2026-11-06' });
  // the reader guessed a Key Date's name: it gives way to the person's own trip nearby
  const r1 = ex({ trip: 'MISMO Team Meeting — In Person in DC', auto: { trip: 1 }, date: '2026-11-13' });
  assert.equal(X.placeTrip([mine, old, r1], r1), 'DC Trip');
  // no trip at all: joins the one trip nearby
  const r2 = ex({ date: '2026-11-15' });
  assert.equal(X.placeTrip([mine, old, r2], r2), 'DC Trip');
  // a trip the person picked is never moved
  const r3 = ex({ trip: 'Something Else', date: '2026-11-13' });
  assert.equal(X.placeTrip([mine, r3], r3), null);
  // nothing within 3 days: left as it is (the reader's name starts a new trip)
  const r4 = ex({ trip: 'MBA Annual 2026', auto: { trip: 1 }, date: '2026-10-20' });
  assert.equal(X.placeTrip([mine, old, r4], r4), null);
  // two trips equally close and no trip on the receipt: left for the person to pick
  const t1 = ex({ trip: 'A', date: '2026-11-10' }), t2 = ex({ trip: 'B', date: '2026-11-14' }), r5 = ex({ date: '2026-11-12' });
  assert.equal(X.placeTrip([t1, t2, r5], r5), null);
  // someone else's trips are never used
  const p = ex({ who: 'perry', trip: 'Perry Trip', date: '2026-11-12' }), r6 = ex({ date: '2026-11-12' });
  assert.equal(X.placeTrip([p, r6], r6), null);
  // already entered: left alone
  assert.equal(X.placeTrip([mine, Object.assign({}, r2, { submitted: 1 })], Object.assign({}, r2, { submitted: 1 })), null);
});

t('one-tap trip choices: open trips, closest dates first', () => {
  const a = ex({ trip: 'Fall Summit', date: '2026-09-20' }), b = ex({ trip: 'DC Trip', date: '2026-11-12' }), c = ex({ trip: 'Entered One', date: '2026-11-13', submitted: 1 });
  const loose = ex({ date: '2026-11-14' });
  const ch = X.tripChoices([a, b, c, loose], 'amy');
  assert.deepEqual(ch.map(t => t.trip), ['DC Trip', 'Fall Summit']);
  assert.equal(ch[0].best, true); assert.equal(ch[1].best, false);
});

t('problems listed before sending (never blocking)', () => {
  const p = X.problems([ex({ name: 'Hotel', cat: 'Hotel/Lodging', amt: '300', date: '2026-11-12' }), ex({ name: 'Cab', amt: '20' }), ex({ cat: 'Mileage', amt: '30', date: '2026-11-12', name: 'Office to Dulles' })], []);
  assert.deepEqual(p, ['Hotel ($300.00): no receipt', 'Cab ($20.00): needs a type, a date']);
});

t('DataBasics export columns', () => {
  const pn = id => ({ amy: 'Amy Moses' })[id] || id;
  const csv = X.csv([ex({ trip: 'DC, Trip', cat: 'Mileage', date: '2026-11-12', name: 'Office to Dulles', amt: '31.92', rcptAmt: '31.92', notes: 'Mileage: 42 miles' }),
    ex({ trip: 'DC, Trip', cat: 'Parking', date: '2026-11-11', name: 'Garage', amt: '20', rcptAmt: '20', asset: 'r', submitted: 1, notes: 'He said "ok"' })], pn, s => s);
  const rows = csv.split('\r\n');
  assert.equal(rows[0], 'Trip Name,Consultant Name,Expense Type,Expense Date,Expense Name,Receipt (Yes/No),Receipt Amount,Expense Amount,Invoice Submitted,Notes');
  assert.equal(rows[1], '"DC, Trip",Amy Moses,Parking,2026-11-11,Garage,Yes,20,20,Yes,"He said ""ok"""');
  assert.equal(rows[2], '"DC, Trip",Amy Moses,Mileage,2026-11-12,Office to Dulles,No,31.92,31.92,No,Mileage: 42 miles');
});

t('receipt file names: First - Name - YYYY-MM-DD - $amount', () => {
  const used = {};
  const e = ex({ name: 'Zinburger', date: '2026-11-11', amt: '45.43', rcptName: 'image.jpg' });
  assert.equal(X.receiptName(e, 'Amy', used), 'Amy - Zinburger - 2026-11-11 - $45.43.jpg');
  assert.equal(X.receiptName(e, 'Amy', used), 'Amy - Zinburger - 2026-11-11 - $45.43 (2).jpg');
  assert.equal(X.receiptName(ex({ name: 'Fwd: Your trip / Uber', date: '2026-11-15', amt: '73.87', rcptType: 'application/pdf' }), 'Jonna', {}), 'Jonna - Your trip Uber - 2026-11-15 - $73.87.pdf');   // "Fwd:" and the slash are dropped
  assert.equal(X.receiptName(ex({ cat: 'Parking' }), 'Perry', {}), 'Perry - Parking.jpg');
});

console.log('\nAll ' + n + ' Expenses rule checks passed.');

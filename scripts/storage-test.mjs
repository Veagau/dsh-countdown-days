import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const storage = source.slice(source.indexOf('    const DEFAULT_SETTINGS ='), source.indexOf('    function loadSettings()'));
const backup = source.slice(source.indexOf('    function parseBackup(text)'), source.indexOf('    function CountdownPanel()'));
assert.ok(storage.includes('function decodeEvents') && backup.includes('decodeEvents'));
function harness(raw = null, lunarSupported = true) {
  let value = raw;
  let readFails = false;
  const context = vm.createContext({
    window: { localStorage: { getItem: () => { if (readFails) throw new Error('unavailable'); return value; }, setItem: (_key, v) => { value = v; }, removeItem: () => {} } },
    STORAGE_KEY: 'store', SCHEMA: 'dsh.countdown-days', STORE_VERSION: 1, MAX_EVENTS: 500,
    CATEGORIES: ['birthday', 'anniversary', 'important', 'loan', 'creditcard', 'custom'],
    RECURRENCES: ['yearly', 'monthly', 'weekly', 'once'],
    daysInMonth: (y, m) => new Date(y, m, 0).getDate(),
    lunarYearLeapMonth: () => lunarSupported ? 2 : 0,
    lunarDateOf: () => lunarSupported ? new Date() : null,
  });
  vm.runInContext(`${storage}\n${backup}\nglobalThis.api = { loadState, saveState, snapshotIsCurrent, parseBackup };`, context);
  return { ...context.api, raw: () => value, replace: v => { value = v; }, failReads: v => { readFails = v; } };
}
const event = { id: 'a', title: 'Test', dateType: 'solar', solar: { year: 2024, month: 2, day: 29 } };
const wrap = events => JSON.stringify({ schema: 'dsh.countdown-days', version: 1, events });
const invalid = [
  '{', '', '{}', JSON.stringify({ version: 2, events: [] }), JSON.stringify({ schema: 'other', events: [] }),
  wrap(Array.from({ length: 501 }, (_, i) => ({ ...event, id: String(i) }))),
  wrap([event, { ...event, id: 'b', title: '' }]), wrap([event, event]),
  wrap([{ ...event, title: 'x'.repeat(81) }]), wrap([{ ...event, note: 'x'.repeat(501) }]),
  wrap([{ ...event, solar: { year: 2024, month: 2, day: 30 } }]),
  wrap([{ ...event, solar: { year: 2024, month: 2.5, day: 1 } }]),
  wrap([{ ...event, reminderDays: [0, 999] }]), wrap([{ ...event, extra: true }]),
  wrap([{ ...event, dateType: 'lunar', solar: undefined, lunar: { year: 2024, month: 1, day: 1, leap: false } }]),
];
for (const text of invalid) {
  const h = harness(text, false);
  const snapshot = {};
  h.loadState(snapshot);
  assert.equal(snapshot.locked, true);
  assert.equal(h.saveState({ events: [] }, snapshot), false, text.slice(0, 100));
  assert.equal(h.raw(), text);
  assert.equal(h.parseBackup(text), null);
}
for (const input of [JSON.stringify([event]), JSON.stringify({ events: [event] }), JSON.stringify({ version: 0, events: [event] }), wrap([event])]) {
  const h = harness(input);
  const snapshot = {};
  const state = h.loadState(snapshot);
  assert.equal(state.events.length, 1);
  assert.equal(h.parseBackup(input).length, 1);
  assert.equal(h.saveState(state, snapshot), true);
}
const h = harness();
const oldPanel = {};
const newPanel = {};
const oldState = h.loadState(oldPanel);
h.replace(wrap([event]));
const newState = h.loadState(newPanel);
assert.equal(h.snapshotIsCurrent(oldPanel), false); // stale export is rejected
assert.equal(h.snapshotIsCurrent(newPanel), true);
assert.equal(h.saveState(oldState, oldPanel), false);
assert.equal(h.raw(), wrap([event]));
assert.equal(h.saveState(newState, newPanel), true);
assert.equal(h.snapshotIsCurrent(newPanel), true);
assert.equal(h.snapshotIsCurrent(oldPanel), false);
// A background load, including a failed one, never changes either panel's authority.
h.loadState();
h.replace('{');
h.loadState();
assert.equal(newPanel.locked, false);
assert.equal(h.saveState(newState, newPanel), false);
h.replace(newPanel.raw);
assert.equal(h.snapshotIsCurrent(newPanel), true);
assert.equal(h.saveState(oldState, oldPanel), false);
h.failReads(true);
const failedPanel = {};
h.loadState(failedPanel);
assert.equal(failedPanel.locked, true);
assert.equal(h.snapshotIsCurrent(newPanel), false);
h.failReads(false);
assert.equal(h.saveState({ events: [] }, failedPanel), false);
assert.equal(h.snapshotIsCurrent(newPanel), true);
assert.match(source, /role: 'alert'[^\n]*T\('storage\.readError'\)/);
console.log('Storage and backup tests passed.');

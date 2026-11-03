import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../client.js', import.meta.url), 'utf8');
const probe = source.slice(source.indexOf('    function storageAvailable()'), source.indexOf('    function uid()'));
const settings = source.slice(source.indexOf('    let settingsSnapshot;'), source.indexOf('    /* ------------------------------------------------------------------ */', source.indexOf('    function pruneFired')));
const defaults = source.slice(source.indexOf('    const DEFAULT_SETTINGS ='), source.indexOf('    function storageAvailable()'));
function harness(initial = null) {
  const data = new Map(initial === null ? [] : [['settings', initial]]);
  let fail = false;
  const localStorage = {
    getItem(key) { if (fail) throw Error('blocked'); return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { if (fail) throw Error('blocked'); data.set(key, String(value)); },
    removeItem(key) { if (fail) throw Error('blocked'); data.delete(key); },
  };
  let notices = 0;
  const reminder = source.slice(source.indexOf('    function fireReminders('), source.indexOf('\n    }', source.indexOf('    function fireReminders(')) + 6);
  const context = vm.createContext({ window: { localStorage, dispatchEvent() { notices++; } }, SETTINGS_KEY: 'settings', MS_DAY: 86400000, T: x => x, dateKey: () => 'date', CustomEvent: class {} });
  vm.runInContext(`${defaults}\n${probe}\n${settings}\n${reminder}\nglobalThis.api = { storageAvailable, loadSettings, saveSettings, pruneFired, fireReminders };`, context);
  return { ...context.api, data, block: () => { fail = true; }, notices: () => notices };
}
for (const raw of ['{', '', 'null', '[]', '42', '{"unknown":1}', '{"notifications":1}', '{"defaultReminderTime":"99:99"}', '{"fired":[]}', '{"fired":{"x":"123"}}']) {
  const h = harness(raw);
  const loaded = h.loadSettings();
  assert.equal(loaded.notifications, false, raw);
  assert.equal(h.saveSettings({ ...loaded, notifications: true }), false, raw);
  assert.equal(h.data.get('settings'), raw);
}
for (const raw of [null, '{}', '{"notifications":false}', '{"fired":{"x":123}}']) {
  const h = harness(raw);
  const loaded = h.loadSettings();
  assert.equal(h.saveSettings({ ...loaded, defaultReminderTime: '10:30' }), true);
  assert.equal(JSON.parse(h.data.get('settings')).defaultReminderTime, '10:30');
}
{
  const h = harness('{}');
  const loaded = h.loadSettings();
  h.data.set('settings', '{"notifications":false}');
  assert.equal(h.saveSettings(loaded), false);
  assert.equal(h.data.get('settings'), '{"notifications":false}');
}
{
  const h = harness('{"notifications":true}');
  h.block();
  assert.equal(h.loadSettings().notifications, false);
  assert.equal(h.saveSettings({ notifications: true }), false);
  assert.equal(h.data.get('settings'), '{"notifications":true}');
}
{
  const h = harness();
  h.data.set('__dsh_cd_probe__', 'original');
  assert.equal(h.storageAvailable(), true);
  assert.equal(h.data.get('__dsh_cd_probe__'), 'original');
  assert.equal(h.data.size, 1);
}
{
  const item = { key: 'a', event: { id: 'a', title: 'A' }, occurrence: { daysUntil: 0 } };
  const h = harness('{broken');
  h.fireReminders([item], new Date());
  assert.equal(h.notices(), 0);
  assert.equal(h.data.get('settings'), '{broken');
  h.data.set('settings', '{}');
  h.fireReminders([item], new Date());
  assert.equal(h.notices(), 1);
  h.fireReminders([item], new Date());
  assert.equal(h.notices(), 1);
}
console.log('Settings and probe tests passed.');

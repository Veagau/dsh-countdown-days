import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

if (!process.env.COUNTDOWN_LUNAR_TEST_CHILD) {
  for (const zone of ['UTC', 'America/New_York', 'Australia/Lord_Howe', 'Pacific/Apia']) {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, TZ: zone, COUNTDOWN_LUNAR_TEST_CHILD: '1' },
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, `${zone}: ${result.stderr || result.stdout}`);
    console.log(`Lunar tests passed: ${zone}`);
  }
} else {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8');
  const begin = source.indexOf('/* LUNAR-CORE:BEGIN');
  const end = source.indexOf('/* LUNAR-CORE:END');
  assert.ok(begin >= 0 && end > begin, 'lunar core markers exist');
  const code = `const MS_DAY = 86400000;\n${source.slice(begin, end)}\n` +
    'globalThis.core = { lunarSupported, lunarPartsOf, lunarToSolar, lunarYearLeapMonth, dateKey, dayDiff };';
  const context = vm.createContext({ Intl, Date });
  vm.runInContext(code, context);
  const core = context.core;
  assert.equal(core.lunarSupported, true, 'full Chinese ICU calendar required for tests');
  for (const [year, month, day, leap, expected] of [
    [2024, 1, 1, false, '2024-02-10'],
    [2023, 2, 1, true, '2023-03-22'],
    [2023, 2, 1, false, '2023-02-20'],
    [2024, 8, 15, false, '2024-09-17'],
  ]) {
    const date = core.lunarToSolar(year, month, day, leap);
    assert.ok(date, `conversion ${year}/${month}/${day}`);
    assert.equal(core.dateKey(date), expected);
    const parts = core.lunarPartsOf(date);
    assert.deepEqual([parts.year, parts.month, parts.day, parts.leap], [year, month, day, leap]);
  }
  assert.equal(core.lunarYearLeapMonth(2023), 2);
  assert.equal(core.lunarYearLeapMonth(2024), 0);
  assert.equal(core.dayDiff(new Date(2024, 2, 11), new Date(2024, 2, 9)), 2);
  const fallbackIntl = { DateTimeFormat: class {
    resolvedOptions() { return { calendar: 'gregory' }; }
  } };
  const fallback = vm.createContext({ Intl: fallbackIntl, Date });
  vm.runInContext(code, fallback);
  assert.equal(fallback.core.lunarSupported, false);
  assert.equal(fallback.core.lunarToSolar(2024, 1, 1, false), null);
  const incompleteIntl = { DateTimeFormat: class {
    resolvedOptions() { return { calendar: 'chinese' }; }
    formatToParts() { return [{ type: 'year', value: '2024' }]; }
  } };
  const incomplete = vm.createContext({ Intl: incompleteIntl, Date });
  vm.runInContext(code, incomplete);
  assert.equal(incomplete.core.lunarSupported, false);
  const missingLeapIntl = { DateTimeFormat: class {
    constructor(...args) { this.formatter = new Intl.DateTimeFormat(...args); }
    resolvedOptions() { return this.formatter.resolvedOptions(); }
    formatToParts(date) {
      return this.formatter.formatToParts(date).map(part => part.type === 'month'
        ? { ...part, value: part.value.replace(/^闰/, '') } : part);
    }
  } };
  const missingLeap = vm.createContext({ Intl: missingLeapIntl, Date });
  vm.runInContext(code, missingLeap);
  const ordinaryProbe = missingLeap.core.lunarPartsOf(new Date(2024, 1, 10, 12));
  assert.deepEqual([ordinaryProbe.year, ordinaryProbe.month, ordinaryProbe.day, ordinaryProbe.leap], [2024, 1, 1, false]);
  const leapProbe = missingLeap.core.lunarPartsOf(new Date(2023, 2, 22, 12));
  assert.deepEqual([leapProbe.year, leapProbe.month, leapProbe.day, leapProbe.leap], [2023, 2, 1, false]);
  assert.equal(missingLeap.core.lunarSupported, false);
  assert.equal(missingLeap.core.lunarToSolar(2024, 1, 1, false), null);
  assert.equal(missingLeap.core.lunarToSolar(2023, 2, 1, true), null);
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createTranslator } from 'next-intl';
import { getWeatherCondition, WMO_CODES } from '../src/lib/weather/codes.ts';

for (const [locale, expected] of [
  ['en', 'Slight rain'], ['ru', 'Небольшой дождь'], ['es', 'Lluvia leve'],
  ['de', 'Leichter Regen'], ['fr', 'Pluie légère'],
]) {
  test(`weather conditions use the actual ${locale} catalogue`, () => {
    const messages = JSON.parse(readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8'));
    const t = createTranslator({ locale, messages, namespace: 'weather.conditions', onError(error) { throw error; } });
    assert.equal(getWeatherCondition(61, true, t).description, expected);
    for (const code of Object.keys(WMO_CODES)) assert.ok(getWeatherCondition(Number(code), true, t).description);
    assert.equal(getWeatherCondition(0, false, t).icon, 'Moon');
    assert.equal(getWeatherCondition(999, true, t).description, getWeatherCondition(0, true, t).description);
  });
}

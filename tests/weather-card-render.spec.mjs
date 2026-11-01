import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { createTranslator } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { getWeatherCondition } from '../src/lib/weather/codes.ts';

const require = createRequire(import.meta.url);
test('async weather card uses the server translator and renders a translated condition', async () => {
  const messages = JSON.parse(readFileSync(new URL('../messages/es.json', import.meta.url), 'utf8'));
  const source = readFileSync(new URL('../src/app/embed/card/weather/page.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  const api = {};
  runInNewContext(code, { exports: api, require(id) {
    if (id === 'next-intl/server') return { getLocale: async () => 'es', getTranslations: async namespace => createTranslator({ locale: 'es', messages, namespace }) };
    if (id === '@/lib/weather/client') return { fetchWeather: async () => ({ current: {
      weather_code: 61, is_day: true, temperature: 18, apparent_temperature: 17,
      wind_speed: 5, wind_direction: 90, humidity: 80, pressure: 1000,
    } }) };
    if (id === '@/lib/weather/codes') return { getWeatherCondition };
    if (id === '@/lib/weather/units') return { formatTemperature: n => `${n}°C`, formatWindSpeed: n => `${n} km/h`, windDirectionToCompass: () => 'E' };
    if (id === 'next-intl') throw Error('Async server components must not call translation hooks');
    return require(id);
  } });
  const html = renderToStaticMarkup(await api.default({ searchParams: Promise.resolve({ lat: '51', lon: '-1', name: 'Test' }) }));
  assert.ok(html.includes('Lluvia leve'));
  assert.ok(!html.includes('Slight rain'));
  assert.ok(html.includes('18°C'));
});

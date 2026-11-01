import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
const exports={};
const source=ts.transpileModule(readFileSync(new URL('../src/lib/weather/units.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
runInNewContext(source,{exports,Intl});
test('wind units follow the selected locale and retain physical units',()=>{
 for(const locale of ['en','ru','es','de','fr']) for(const [value,unit]of [[24,'kmh'],[15,'mph'],[6,'ms']]) {
  const units={kmh:'kilometer-per-hour',mph:'mile-per-hour',ms:'meter-per-second'};
  assert.equal(exports.formatWindSpeed(value,unit,locale),new Intl.NumberFormat(locale,{style:'unit',unit:units[unit],unitDisplay:'short',maximumFractionDigits:0}).format(value));
 }
 assert.match(exports.formatWindSpeed(12,'knots','ru'),/уз$/);
});
test('compass labels localize, wrap around and support regional locale fallback',()=>{
 assert.equal(exports.windDirectionToCompass(90,'ru-RU'),'В');
 assert.equal(exports.windDirectionToCompass(270,'fr'),'O');
 assert.equal(exports.windDirectionToCompass(270,'es'),'O');
 assert.equal(exports.windDirectionToCompass(90,'de'),'O');
 assert.equal(exports.windDirectionToCompass(-90,'ru'),'З');
 assert.equal(exports.windDirectionToCompass(360,'en'),'N');
 assert.equal(exports.windDirectionToCompass(90,'unknown'),'E');
});

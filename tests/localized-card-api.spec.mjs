import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {createTranslator} from 'next-intl';
const root = new URL('../', import.meta.url);
function load(path, mocks) {
  const code = ts.transpileModule(readFileSync(new URL(path, root), 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports={};
  vm.runInNewContext(code,{exports,require(name){if(name in mocks)return mocks[name];throw new Error('Unexpected dependency: '+name)},URL,Request,Response,Intl,process:{env:{}}});
  return exports;
}
for(const locale of ['en','ru','es','de','fr']) test(`card API renders real ${locale} messages`, async()=>{
  const messages=JSON.parse(readFileSync(new URL('messages/'+locale+'.json',root),'utf8'));
  const intl={getLocale:async()=>locale,getTranslations:async namespace=>createTranslator({locale,messages,namespace})};
  const next={NextResponse:{json:body=>Response.json(body)}};
  const units=load('src/lib/weather/units.ts',{}),codes=load('src/lib/weather/codes.ts',{});
  const {GET}=load('src/app/api/cards/weather-summary/route.ts',{
    'next-intl/server':intl,'next/server':next,'@/lib/weather/units':units,'@/lib/weather/codes':codes,
    '@/lib/weather/client':{fetchWeather:async()=>({current:{weather_code:0,is_day:1,temperature:20,apparent_temperature:18,wind_speed:12,wind_direction:90,humidity:60,pressure:1013,cloud_cover:0}})},
  });
  const body=await(await GET(new Request('https://app.example/api/cards/weather-summary?lat=48&lon=2&name=Paris'))).json();
  assert.equal(body.title,'Paris');
  assert.equal(body.actions[0].label,({en:'View Forecast',ru:'Прогноз погоды',es:'Ver pronóstico',de:'Vorhersage ansehen',fr:'Voir les prévisions'})[locale]);
  assert.ok(body.description.includes('20°C'));assert.ok(body.description.includes('18°C'));
  assert.equal(body.facts.find(f=>f.label===({en:'Wind',ru:'Ветер',es:'Viento',de:'Wind',fr:'Vent'})[locale]).value,units.formatWindSpeed(12,'kmh',locale)+' '+units.windDirectionToCompass(90,locale));

});

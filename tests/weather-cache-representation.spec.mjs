import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

test("weather cache isolates units, timezone, exact location and acting user", async () => {
  const source = readFileSync(new URL("../src/lib/weather/client.ts", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const requests = [];
  const exports = {};
  new Function("exports", "require", compiled)(exports, (name) => {
    assert.equal(name, "@/lib/internet");
    return { internetFetch: async (url, _options, userId) => {
      const params = new URL(url).searchParams;
      requests.push({ params, userId });
      const temperature = params.get("temperature_unit") === "fahrenheit" ? 50 : 10;
      return { ok: true, json: async () => ({
        current: { temperature_2m: temperature },
        hourly: { temperature_2m: [temperature] },
        daily: { temperature_2m_max: [temperature] },
        timezone: params.get("timezone"),
      }) };
    } };
  });
  const fetch = (...args) => exports.fetchWeather(...args);
  const metric = [51.5, -0.12, "Europe/London", "celsius", "kmh", "mm", "alice"];
  assert.equal((await fetch(...metric)).current.temperature, 10);
  assert.equal((await fetch(...metric)).current.temperature, 10);
  assert.equal(requests.length, 1, "identical representation reuses cache");
  const fahrenheit = [...metric]; fahrenheit[3] = "fahrenheit";
  assert.equal((await fetch(...fahrenheit)).current.temperature, 50);
  assert.equal((await fetch(...fahrenheit)).daily.temperature_2m_max[0], 50);
  for (const [index, value] of [[0, 51.501], [2, "UTC"], [4, "mph"], [5, "inch"], [6, "bob"]]) {
    const changed = [...metric]; changed[index] = value;
    await fetch(...changed);
  }
  assert.equal(requests.length, 7, "every response-defining input has its own cache entry");
  assert.equal(requests.at(-1).userId, "bob");
  assert.equal((await fetch(...metric)).current.temperature, 10, "unit changes do not overwrite metric data");
  assert.equal(requests.length, 7);
});

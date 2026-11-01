import assert from "node:assert/strict";
import test from "node:test";
import { loadWeather } from "../src/lib/weather/load.ts";

const current = { location_name: "Current location" };
const forecast = { daily: { time: [] }, hourly: { time: [] }, timezone: "UTC" };
const params = new URLSearchParams({ location_id: "one" });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
function observe() {
  const events = [];
  const handlers = Object.fromEntries([
    "onCurrent", "onCurrentError", "onCurrentSettled", "onForecast", "onForecastError",
  ].map(name => [name, value => events.push([name, value])]));
  return { events, handlers };
}

test("current conditions survive optional forecast HTTP, transport, JSON and missing-data failures", async () => {
  for (const failedForecast of [
    async () => new Response(null, { status: 503 }),
    async () => { throw new TypeError("Connection interrupted"); },
    async () => new Response("{invalid"),
    async () => Response.json({ data: null }),
  ]) {
    const { events, handlers } = observe();
    await loadWeather(params, new AbortController().signal, handlers, async url =>
      url.includes("/current?") ? Response.json({ data: current }) : failedForecast());
    assert.deepEqual(events.filter(([name]) => name === "onCurrent"), [["onCurrent", current]]);
    assert.equal(events.filter(([name]) => name === "onCurrentSettled").length, 1);
    assert.equal(events.filter(([name]) => name === "onForecastError").length, 1);
    assert.ok(!events.some(([name]) => name === "onCurrentError" || name === "onForecast"));
  }
});

test("current conditions settle while the optional forecast is still pending", async () => {
  const delayedForecast = deferred();
  const currentReady = deferred();
  const { events, handlers } = observe();
  const pending = loadWeather(params, new AbortController().signal, {
    ...handlers,
    onCurrentSettled() { handlers.onCurrentSettled(); currentReady.resolve(); },
  }, async url => url.includes("/current?")
    ? Response.json({ data: current })
    : delayedForecast.promise);
  await currentReady.promise;
  assert.deepEqual(events, [["onCurrent", current], ["onCurrentSettled", undefined]]);
  delayedForecast.resolve(Response.json({ data: forecast }));
  await pending;
  assert.deepEqual(events.at(-1), ["onForecast", forecast]);
});

test("current HTTP and decoding failures use their own error path", async () => {
  for (const response of [
    () => new Response(null, { status: 503 }),
    () => new Response("{invalid"),
  ]) {
    const { events, handlers } = observe();
    await loadWeather(params, new AbortController().signal, handlers, async url =>
      url.includes("/current?") ? response() : Response.json({ data: forecast }));
    assert.equal(events.filter(([name]) => name === "onCurrentError").length, 1);
    assert.equal(events.filter(([name]) => name === "onCurrentSettled").length, 1);
    assert.ok(!events.some(([name]) => name === "onCurrent" || name === "onForecastError"));
  }
});

test("switching locations prevents stale callbacks even if transport and decoding ignore abort", async () => {
  const oldCurrent = deferred();
  const oldForecast = deferred();
  const decoding = deferred();
  const old = new AbortController();
  const { events, handlers } = observe();
  let decodingStarted = 0;
  const oldRequest = loadWeather(params, old.signal, handlers, async (_url, options) => {
    assert.equal(options.signal, old.signal);
    const json = _url.includes("/current?") ? oldCurrent : oldForecast;
    return { ok: true, json: () => {
      if (++decodingStarted === 2) decoding.resolve();
      return json.promise;
    } };
  });
  await decoding.promise;
  old.abort();
  await loadWeather(new URLSearchParams({ location_id: "two" }), new AbortController().signal, handlers,
    async url => Response.json({ data: url.includes("/current?")
      ? { ...current, location_name: "New location" }
      : forecast }));
  const accepted = [...events];
  oldCurrent.resolve({ data: current });
  oldForecast.resolve({ data: forecast });
  await oldRequest;
  assert.deepEqual(events, accepted, "aborted data, errors and loading callbacks must not replace the new location");
  assert.equal(events.find(([name]) => name === "onCurrent")[1].location_name, "New location");
});

test("aborted requests publish no late errors and pre-aborted requests do not fetch", async () => {
  const controller = new AbortController();
  const response = deferred();
  const { events, handlers } = observe();
  const pending = loadWeather(params, controller.signal, handlers, async () => response.promise);
  controller.abort();
  response.resolve(new Response(null, { status: 503 }));
  await pending;
  await loadWeather(params, controller.signal, handlers, async () => assert.fail("must not fetch"));
  assert.deepEqual(events, []);
});

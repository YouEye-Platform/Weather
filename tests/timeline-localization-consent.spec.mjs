import assert from "node:assert/strict";
import test, { after } from "node:test";
import { registerHooks } from "node:module";
import { postAdmittedTimeline } from "../src/lib/api/timeline.ts";

// Load the real emitter and admission helper. Only platform I/O and translation
// lookup are mocked, so delayed localization exercises the actual timestamp path.
const moduleUrl = source => `data:text/javascript,${encodeURIComponent(source)}`;
const apiUrl = moduleUrl(`export const createApiClient = () => ({
  postTimelineEntry: (...args) => globalThis.timelineEmitterFixture.post(...args)
});`);
const translatorUrl = moduleUrl(`export const getActivityTranslator = (...args) =>
  globalThis.timelineEmitterFixture.translate(...args);`);
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/api") return { url: apiUrl, shortCircuit: true };
    if (specifier === "@/i18n/activity") return { url: translatorUrl, shortCircuit: true };
    return nextResolve(specifier, context);
  },
});
after(() => { hooks.deregister(); delete globalThis.timelineEmitterFixture; });

const revision = "e601ca02-6c56-4bdb-a6f5-55735df464d3";
const actionTime = "2026-10-28T01:00:00.000Z";
const laterTime = "2026-10-28T02:00:00.000Z";
const earlierTime = "2026-10-28T00:30:00.000Z";
const cases = [
  ["emitWeatherCheckEvent", ["account-a", "Location", "one", "10°C", "Clear", "example.invalid", 1, 2]],
  ["emitLocationAddedEvent", ["account-a", "Location", "one", "example.invalid", 1, 2]],
];
let moduleId = 0;
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function exercise(t, name, args, { enabledAt, originalTimestamp }) {
  t.mock.timers.enable({ apis: ["Date"], now: Date.parse(actionTime) });
  const started = deferred();
  const release = deferred();
  const calls = [];
  const timestamps = [];
  let enabled = false;
  globalThis.timelineEmitterFixture = {
    translate: async userId => {
      assert.equal(userId, "account-a");
      started.resolve();
      await release.promise;
      return { t: key => key };
    },
    post: (userId, collection, data) => {
      timestamps.push(data.timestamp);
      return postAdmittedTimeline(async (path, options, user) => {
        calls.push({ path, options, user });
        return path === "/timeline/collection"
          ? Response.json({ enabled, revision, enabledAt })
          : new Response(null, { status: 201 });
      }, userId, collection, data);
    },
  };
  const emitter = await import(new URL(`../src/lib/timeline/emit.ts?test=${++moduleId}`, import.meta.url));
  const pending = emitter[name](...args, ...(originalTimestamp === undefined ? [] : [originalTimestamp]));
  await started.promise;
  assert.equal(calls.length, 0);
  t.mock.timers.setTime(Date.parse(laterTime));
  enabled = true;
  release.resolve();
  await pending;
  return { calls, timestamps };
}

test("enabling collection during locale lookup cannot admit an earlier action", async t => {
  for (const [name, args] of cases) await t.test(name, async t => {
    const { calls, timestamps } = await exercise(t, name, args, { enabledAt: laterTime });
    assert.deepEqual(timestamps, [actionTime]);
    assert.deepEqual(calls.map(call => call.path), ["/timeline/collection"]);
    assert.equal(calls[0].user, "account-a");
    assert.equal(calls[0].options.body, undefined);
  });
});

test("an already enabled interval receives the unchanged action timestamp and exact revision", async t => {
  for (const [name, args] of cases) await t.test(name, async t => {
    const { calls } = await exercise(t, name, args, { enabledAt: earlierTime });
    assert.deepEqual(calls.map(call => call.path), ["/timeline/collection", "/timeline"]);
    const payload = JSON.parse(calls[1].options.body);
    assert.equal(payload.timestamp, actionTime);
    assert.equal(payload.collection_revision, revision);
  });
});

test("an explicitly known earlier timestamp is preserved for both accepted and rejected events", async t => {
  for (const [name, args] of cases) for (const enabledAt of ["2026-10-28T00:00:00.000Z", actionTime]) {
    await t.test(`${name}: ${enabledAt}`, async t => {
      const { calls, timestamps } = await exercise(t, name, args, { enabledAt, originalTimestamp: earlierTime });
      assert.deepEqual(timestamps, [earlierTime]);
      const expectedCalls = Date.parse(earlierTime) < Date.parse(enabledAt) ? 1 : 2;
      assert.equal(calls.length, expectedCalls);
      if (expectedCalls === 2) assert.equal(JSON.parse(calls[1].options.body).timestamp, earlierTime);
    });
  }
});

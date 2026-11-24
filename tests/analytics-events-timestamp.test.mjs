// A crafted timestamp must never throw out of the route handler: an object-shaped timestamp is refused, not coerced.
// Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/pages/api/analytics/events.ts';

const ORIGIN = 'https://obx-route-probe.test';
const SITE = new URL(ORIGIN);
const CONSENT = { state: 'granted', version: 'rr-analytics-consent-v1' };
const ISO = '2026-11-20T12:34:56.789Z';
const GOOD = { name: 'page_view', timestamp: ISO, page_path: '/harden-test' };

function makeRequest(events) {
  return new Request(ORIGIN + '/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({
      site_token: 'obx-route-probe.test',
      consent: CONSENT,
      visitor_id: 'visitor-harden-1',
      events,
    }),
  });
}

// Runs the route's own POST handler with the PostHog call captured, so the test can assert on the exact batch
// bytes that would have gone to PostHog. No network call is made.
async function post(events) {
  const calls = [];
  const realFetch = globalThis.fetch;
  const prevKey = process.env.POSTHOG_PROJECT_KEY;
  process.env.POSTHOG_PROJECT_KEY = 'phc_probe_key';
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: String(init && init.body) });
    return new Response('{"status":1}', { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    const res = await POST({ request: makeRequest(events), site: SITE });
    const body = await res.json();
    const batch = calls.length ? JSON.parse(calls[0].body).batch : [];
    return { status: res.status, body, batch };
  } finally {
    globalThis.fetch = realFetch;
    if (prevKey === undefined) delete process.env.POSTHOG_PROJECT_KEY;
    else process.env.POSTHOG_PROJECT_KEY = prevKey;
  }
}

test('crafted timestamp is refused, not coerced: 202, one event fewer, nothing forwarded for it', async () => {
  const control = await post([GOOD, GOOD]);
  assert.equal(control.status, 202, 'control answers 202');
  assert.equal(control.body.accepted, 2, 'control accepts both events');
  assert.equal(control.batch.length, 2, 'control forwards both events');

  const crafted = await post([
    { name: 'page_view', timestamp: { toString: null }, page_path: '/harden-test' },
    GOOD,
  ]);
  assert.equal(crafted.status, 202, 'crafted payload answers 202, not an unlogged 500');
  assert.equal(crafted.body.accepted, 1, 'exactly one event fewer is accepted');
  assert.equal(crafted.batch.length, 1, 'no PostHog batch entry is sent for the crafted event');
  assert.equal(crafted.batch[0].timestamp, ISO, 'the surviving event carries the well-formed timestamp');
});

test('well-formed path is unchanged: an ISO timestamp lands as the same string', async () => {
  const r = await post([GOOD]);
  assert.equal(r.status, 202);
  assert.equal(r.body.accepted, 1);
  assert.equal(r.batch.length, 1);
  assert.equal(r.batch[0].event, 'page_view');
  assert.equal(r.batch[0].distinct_id, 'visitor-harden-1');
  assert.equal(r.batch[0].timestamp, ISO);
});

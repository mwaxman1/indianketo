// A crafted site_token must never throw out of the route handler: an object-shaped token is refused, not coerced.
// Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { POST } from '../src/pages/api/analytics/events.ts';

const ORIGIN = 'https://obx-route-probe.test';
const SITE = new URL(ORIGIN);
const CONSENT = { state: 'granted', version: 'rr-analytics-consent-v1' };
const EVENTS = [{ name: 'page_view', timestamp: '2026-11-20T12:34:56.789Z', page_path: '/harden-test' }];

function makeRequest(siteToken) {
  return new Request(ORIGIN + '/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: ORIGIN },
    body: JSON.stringify({
      site_token: siteToken,
      consent: CONSENT,
      visitor_id: 'visitor-harden-1',
      events: EVENTS,
    }),
  });
}

// Runs the route's own POST handler with the PostHog call stubbed so no network happens; restored in finally.
async function post(siteToken) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"status":1}', { status: 200, headers: { 'content-type': 'application/json' } });
  try {
    const res = await POST({ request: makeRequest(siteToken), site: SITE });
    const body = await res.json();
    return { status: res.status, body };
  } finally {
    globalThis.fetch = realFetch;
  }
}

test('control: a matching string site_token is accepted', async () => {
  const r = await post('obx-route-probe.test');
  assert.equal(r.status, 202, 'control answers 202');
  assert.equal(r.body.ok, true, 'control answers ok true');
});

test('crafted site_token { toString: null } is a 400, not an unlogged 500', async () => {
  const r = await post({ toString: null });
  assert.equal(r.status, 400, 'crafted token answers 400, not a thrown exception');
  assert.equal(r.body.rejected, 'site_token', 'crafted token is rejected as site_token');
});

test('numeric site_token 12345 is a 400, not a coerced match', async () => {
  const r = await post(12345);
  assert.equal(r.status, 400, 'numeric token answers 400');
  assert.equal(r.body.rejected, 'site_token', 'numeric token is rejected as site_token');
});

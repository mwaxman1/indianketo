import type { APIRoute } from 'astro';
import { EVENTS, forward, sanitize, type ContractEvent } from '../../../lib/telemetry.ts';

export const prerender = false;

// First-party collector. Gates run in order; each rejection is JSON and nothing is stored anywhere:
// this deployment has no database, accepted events are only forwarded to PostHog server-side.
const MAX_BYTES = 32 * 1024;
const MAX_EVENTS = 50;
const CONSENT_VERSION = 'rr-analytics-consent-v1';

const json = (status: number, body: Record<string, unknown>, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });

function allowedOrigins(site: URL | undefined): Set<string> {
  const set = new Set<string>();
  if (site) {
    set.add(site.origin);
    set.add(`${site.protocol}//${site.host.startsWith('www.') ? site.host.slice(4) : 'www.' + site.host}`);
  }
  const v = (process.env.VERCEL_URL ?? '').trim();
  if (v) set.add(`https://${v}`);
  return set;
}

export const OPTIONS: APIRoute = ({ request, site }) => {
  const origin = request.headers.get('origin') ?? '';
  const headers: Record<string, string> = { Allow: 'POST, OPTIONS' };
  if (allowedOrigins(site).has(origin)) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-methods'] = 'POST, OPTIONS';
    headers['access-control-allow-headers'] = 'content-type';
    headers['access-control-max-age'] = '600';
    headers.vary = 'Origin';
  }
  return new Response(null, { status: 204, headers });
};

export const ALL: APIRoute = () => json(405, { ok: false, rejected: 'method' }, { Allow: 'POST' });

export const POST: APIRoute = async ({ request, site }) => {
  // 2. origin
  const origin = request.headers.get('origin');
  if (!origin || !allowedOrigins(site).has(origin)) return json(403, { ok: false, rejected: 'origin' });

  // 3. size, then JSON object
  // shortcut: a chunked body without content-length is still buffered before the check; the platform caps it, stream-cap if needed.
  if (Number(request.headers.get('content-length')) > MAX_BYTES) return json(413, { ok: false, rejected: 'too_large' });
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BYTES) return json(413, { ok: false, rejected: 'too_large' });
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(400, { ok: false, rejected: 'body_not_json' });

  // 4. site token must be this deployment's own host (www. stripped)
  const property = (site?.host ?? '').replace(/^www\./, '');
  if (!property || String(body.site_token ?? '').replace(/^www\./, '') !== property) {
    return json(400, { ok: false, rejected: 'site_token' });
  }

  // 5. consent declaration
  const c = body.consent;
  if (!c || typeof c !== 'object' || c.state !== 'granted') return json(403, { ok: false, rejected: 'consent_absent' });
  if (c.version !== CONSENT_VERSION) return json(403, { ok: false, rejected: 'consent_version_unknown' });

  // 6. contract events; a bad event is skipped, not fatal
  const distinct_id = typeof body.visitor_id === 'string' ? body.visitor_id : '';
  const raw: unknown[] = Array.isArray(body.events) ? body.events.slice(0, MAX_EVENTS) : [];
  const events: ContractEvent[] = [];
  for (const e of raw as any[]) {
    if (!e || typeof e !== 'object' || typeof e.name !== 'string' || !Object.hasOwn(EVENTS, e.name)) continue;
    const s = sanitize({
      name: e.name,
      occurred_at: String(e.timestamp ?? ''),
      distinct_id,
      page_path: e.page_path,
      props: e.properties,
    });
    if (s.ok) events.push(s.event);
  }

  // 7. forward (never throws; no key => no network call)
  const r = await forward(events, { property, runtime: 'astro', consent: true });

  // 8. always 202
  const out: Record<string, unknown> = { ok: true, accepted: events.length, duplicates: 0, posthog: r.status };
  if ('key_fp' in r) out.key_fp = r.key_fp;
  if ('http' in r && r.http !== undefined) out.http = r.http;
  return json(202, out);
};

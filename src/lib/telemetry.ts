// GENERATED from posthog-rollout/telemetry/telemetry.ts sha256:8bc8ff38b264bf7973eaeea8b29c06201c1ec3dac8ef78245f2caa3f249b2408 — edit there, then run sync-telemetry.sh
// obx-telemetry v1 — the event contract, the PII guard and the PostHog forwarder (PLAN.md §3, §4).
// Zero dependencies. Server-side only. Canonical copy lives in posthog-rollout/telemetry/; consumers get a
// copy from scripts/sync-telemetry.sh — never edit a copy.
import { createHash } from 'node:crypto';

export const SCHEMA_VERSION = 1;

// ---------------------------------------------------------------------------
// PII guard — moved VERBATIM from site-factory/app/src/pages/api/analytics/events.ts
// (PII_FIELDS, EMAIL_RE, PHONE_RUN_RE, UUID_RE, containsEmail, containsPhone, findPii).
// ---------------------------------------------------------------------------

const PII_FIELDS = new Set([
  'email',
  'contact_email',
  'email_hash',
  'full_name',
  'first_name',
  'last_name',
  'firstname',
  'lastname',
  'phone',
  'phone_number',
  'contact_phone',
  'message',
  'body',
  'transcript',
  'recording_url',
  'address',
  'form_values',
  'note',
  'notes',
]);

/** An email address anywhere in a value. Same shape the browser's validator uses. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;

/**
 * A phone-shaped RUN inside a string. The run is then checked by DIGIT COUNT
 * (10-15): `/services/252-573-5371` is a phone, `2025-10-29` (8 digits) and a
 * 32-digit hex UUID (too many) are not. Counting digits is what keeps this
 * from rejecting a dated blog path as if it were a phone number.
 */
const PHONE_RUN_RE = /\+?\d[\d\s().-]{7,}\d/g;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function containsEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function containsPhone(value: string): boolean {
  const runs = value.match(PHONE_RUN_RE) || [];
  return runs.some((run) => {
    const digits = run.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  });
}

/**
 * True when any string anywhere in the payload carries contact data.
 *
 * It walks the WHOLE body, not the allowlisted fields: a client that invents
 * `{"email": ...}` must be caught by the key, and a client that hides an
 * address inside `service` must be caught by the value. Rejecting on the way
 * in is the only place this can be enforced — once a row is stored, the
 * boundary has already failed.
 */
export function findPii(value: unknown, path = ''): string | null {
  if (typeof value === 'string') {
    // An identifier is neither an email nor a phone number. Skipping UUIDs is
    // not cosmetic: a random v4 id whose hex happens to be digits-and-dashes
    // (e.g. `12345678-1234-4234-9234-...`) IS phone-shaped, and without this
    // line roughly one in thirty ids would be refused as PII. (Caught by the
    // collector's own test, which builds ids from crypto.randomUUID().)
    if (UUID_RE.test(value)) return null;
    if (containsEmail(value)) return `${path || 'body'}: email address`;
    if (containsPhone(value)) return `${path || 'body'}: phone number`;
    return null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findPii(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (PII_FIELDS.has(key.toLowerCase())) return `${path ? path + '.' : ''}${key}: contact field`;
      const hit = findPii(inner, path ? `${path}.${key}` : key);
      if (hit) return hit;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Contract (PLAN.md §3)
// ---------------------------------------------------------------------------

export const EVENTS = {
  page_view: ['landing_path', 'referrer_origin', 'utm_source', 'utm_medium', 'utm_campaign', 'device_category'],
  cta_view: ['cta_id', 'cta_location'],
  cta_click: ['cta_id', 'cta_location'],
  form_start: ['form_id', 'form_kind', 'service'],
  form_submit: ['form_id', 'form_kind', 'service', 'attempt_id'],
  form_error: ['form_id', 'form_kind', 'field'],
  generate_lead: ['form_id', 'form_kind', 'service', 'attempt_id', 'lead_ref', 'latency_ms'],
  phone_click: ['cta_location'],
  email_click: ['cta_location'],
  map_click: ['cta_location'],
  scroll_depth: ['percent'],
  pricing_view: ['pockets_seen'],
  video_play: ['video_id'],
  video_complete: ['video_id'],
  guide_download: ['gated'],
  instrumentation_check: ['run_id'],
} as const satisfies Record<string, readonly string[]>;

export type EventName = keyof typeof EVENTS;

export interface ContractEvent {
  name: string;
  occurred_at: string;
  distinct_id: string;
  uuid?: string;
  page_path?: string;
  props: Record<string, unknown>;
}

/** Deny keys, compared lower-cased with `_` and `-` removed, at any depth (§3). Superset of PII_FIELDS. */
const DENY_KEYS = new Set([
  'email', 'mail', 'phone', 'tel', 'mobile', 'name', 'firstname', 'lastname', 'fullname', 'address', 'street',
  'zip', 'postcode', 'message', 'body', 'note', 'notes', 'comment', 'transcript', 'recordingurl', 'formvalues',
  'ip', 'useragent', 'password', 'dob', 'birthday', 'ssn',
  // the remaining PII_FIELDS spellings, so "superset" is true rather than assumed
  'contactemail', 'emailhash', 'phonenumber', 'contactphone',
]);

const normKey = (k: string) => k.toLowerCase().replace(/[_-]/g, '');

/** First denied key anywhere in the tree, as a path, or null. */
function findDenyKey(value: unknown, path = ''): string | null {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findDenyKey(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const here = path ? `${path}.${k}` : k;
      if (DENY_KEYS.has(normKey(k))) return here;
      const hit = findDenyKey(v, here);
      if (hit) return hit;
    }
  }
  return null;
}

/** True when any string in the tree (or a string value itself) is longer than `max`. */
function hasLongString(value: unknown, max: number): boolean {
  if (typeof value === 'string') return value.length > max;
  if (Array.isArray(value)) return value.some((v) => hasLongString(v, max));
  if (value && typeof value === 'object') return Object.values(value).some((v) => hasLongString(v, max));
  return false;
}

const MAX_SCAN = 1000; // the PII regexes are not linear; nothing legitimate in the contract is this long

const LEAD_REF_RE = /^[A-Z]{2,5}-[A-Z0-9]{4,8}$/;
const RUN_ID_RE = /^ic-[0-9]{10}-[0-9a-f]{8}$/;
const MAX_STR = 100;

/** Per-prop value rules beyond "short scalar". Returns the cleaned value, or undefined to strip the prop. */
function cleanValue(key: string, v: unknown): unknown {
  if (key === 'pockets_seen') {
    if (!Array.isArray(v) || v.length > 10) return undefined;
    return v.every((s) => typeof s === 'string' && s.length <= 40) ? v : undefined;
  }
  if (typeof v === 'string') {
    if (key === 'lead_ref') return LEAD_REF_RE.test(v) ? v : undefined;
    return v.slice(0, MAX_STR);
  }
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return undefined;
    return key === 'percent' && ![25, 50, 75, 100].includes(v) ? undefined : v;
  }
  if (typeof v === 'boolean') return v;
  return undefined; // null, undefined, objects, arrays (other than pockets_seen)
}

/**
 * findPii on a string as sent AND percent-decoded + NFKC-folded, so `a%40b.co` and full-width digits do not slip by.
 * Each %XX run is decoded on its own, so one malformed escape cannot switch decoding off for the rest of the string.
 */
function stringHasPii(v: string): boolean {
  let folded = v;
  for (let i = 0; i < 3; i += 1) {
    const next = folded.replace(/(?:%[0-9a-f]{2})+/gi, (m) => { try { return decodeURIComponent(m); } catch { return m; } });
    if (next === folded) break;
    folded = next;
  }
  return !!(findPii(v) || findPii(folded.normalize('NFKC')));
}

/** stringHasPii over every string in a tree (keys are covered by findDenyKey / findPii). */
function treeHasPii(value: unknown): boolean {
  if (typeof value === 'string') return stringHasPii(value);
  if (Array.isArray(value)) return value.some(treeHasPii);
  if (value && typeof value === 'object') return Object.values(value).some(treeHasPii);
  return false;
}

/** `/a/b?x=1#h` -> `/a/b`. Undefined when it is not a usable path. */
function normPath(p: unknown): string | undefined {
  if (typeof p !== 'string') return undefined;
  const clean = p.split(/[?#]/)[0].slice(0, MAX_STR);
  return clean.startsWith('/') ? clean : undefined;
}

export function sanitize(
  e: ContractEvent,
): { ok: true; event: ContractEvent; stripped: number } | { ok: false; reason: 'unknown_event' | 'pii' | 'invalid' } {
  if (!e || typeof e !== 'object') return { ok: false, reason: 'invalid' };
  if (typeof e.name !== 'string' || !Object.hasOwn(EVENTS, e.name)) return { ok: false, reason: 'unknown_event' };
  if (typeof e.distinct_id !== 'string' || !e.distinct_id || e.distinct_id.length > 128) return { ok: false, reason: 'invalid' };
  if (typeof e.occurred_at !== 'string' || Number.isNaN(Date.parse(e.occurred_at))) return { ok: false, reason: 'invalid' };
  const raw = e.props && typeof e.props === 'object' && !Array.isArray(e.props) ? e.props : {};

  // Bound the work the regexes can be made to do before they run (values are cut to MAX_STR later anyway).
  if (hasLongString(raw, MAX_SCAN) || String(e.distinct_id).length > MAX_SCAN || String(e.page_path ?? '').length > MAX_SCAN) {
    return { ok: false, reason: 'invalid' };
  }
  // PII first, over everything the client sent — including keys that would be stripped anyway.
  // A well-formed run_id (`ic-<10 digits>-<hex>`) is phone-shaped by construction, so it is checked by its
  // pattern below instead of by findPii.
  const scan: Record<string, unknown> = { ...raw };
  if (e.name === 'instrumentation_check' && RUN_ID_RE.test(String(scan.run_id))) delete scan.run_id;
  if (findDenyKey(raw) || findPii(scan) || treeHasPii(scan) || stringHasPii(e.distinct_id) || stringHasPii(String(e.page_path ?? ''))) {
    return { ok: false, reason: 'pii' };
  }

  const allowed = EVENTS[e.name as EventName] as readonly string[];
  const props: Record<string, unknown> = {};
  let stripped = 0;
  for (const [k, v] of Object.entries(raw)) {
    const cleaned = allowed.includes(k) ? cleanValue(k, v) : undefined;
    if (cleaned === undefined) stripped += 1;
    else props[k] = cleaned;
  }
  if (e.name === 'instrumentation_check' && !RUN_ID_RE.test(String(props.run_id ?? ''))) {
    return { ok: false, reason: 'invalid' };
  }
  const page_path = normPath(e.page_path);
  const uuid = typeof e.uuid === 'string' && UUID_RE.test(e.uuid) ? e.uuid : undefined;
  return {
    ok: true,
    stripped,
    event: { name: e.name, occurred_at: e.occurred_at, distinct_id: e.distinct_id, uuid, page_path, props },
  };
}

/** sha256(key) hex, first 8 chars — enough to tell two keys apart, useless for recovering one. */
export function keyFingerprint(key: string): string {
  return createHash('sha256').update(key).digest('hex').slice(0, 8);
}

// ---------------------------------------------------------------------------
// Forwarder (PLAN.md §4.2)
// ---------------------------------------------------------------------------

export interface ForwardOptions {
  property: string;
  runtime: 'astro' | 'next' | 'vercel-fn';
  consent: boolean;
  env?: Record<string, string | undefined>;
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export type ForwardResult =
  | { status: 'absent' }
  | { status: 'skipped'; reason: 'no_consent' | 'empty' }
  | {
      status: 'ok' | 'error';
      http?: number;
      sent: number;
      dropped_pii: number;
      stripped: number;
      key_fp: string;
      error?: string;
    };

const DEFAULT_HOST = 'https://us.i.posthog.com';

/** Business line + lifecycle stage, stamped server-side from the host's env (set by posthog-env.py from the
 *  registry). Allowlisted: anything else, including absent, is 'unset' so an untagged site is visible, not hidden.
 *  A sale moves the property to its own org (PLAN.md §2); 'sold' marks the window before that split. */
export const LINES = ['rishi', 'rank_rent', 'local_smb', 'govcon', 'own_brand', 'client'] as const;
export const STAGES = ['prebuilt', 'live', 'sold'] as const;
function tag(v: string | undefined, allowed: readonly string[]): string {
  const s = (v ?? '').trim();
  return allowed.includes(s) ? s : 'unset';
}

/** Never throws. No key -> no network call. */
export async function forward(events: ContractEvent[], o: ForwardOptions): Promise<ForwardResult> {
  const env = o.env ?? process.env;
  const key = (env.POSTHOG_PROJECT_KEY ?? '').trim();
  if (!key) return { status: 'absent' };
  if (!o.consent) return { status: 'skipped', reason: 'no_consent' };
  if (!events.length) return { status: 'skipped', reason: 'empty' };

  const key_fp = keyFingerprint(key);
  const line = tag(env.POSTHOG_LINE, LINES);
  const stage = tag(env.POSTHOG_STAGE, STAGES);
  const batch: Record<string, unknown>[] = [];
  let dropped_pii = 0;
  let stripped = 0;
  for (const e of events) {
    const s = sanitize(e);
    if (!s.ok) {
      if (s.reason === 'pii') dropped_pii += 1;
      continue;
    }
    stripped += s.stripped;
    const { event: c } = s;
    const properties: Record<string, unknown> = {
      ...c.props,
      property: o.property,
      line,
      stage,
      lib: `obx-telemetry/${SCHEMA_VERSION} (${o.runtime})`,
      schema_version: SCHEMA_VERSION,
      $process_person_profile: false,
      $geoip_disable: true,
    };
    if (c.page_path) properties.$pathname = c.page_path;
    batch.push({
      event: c.name,
      distinct_id: c.distinct_id,
      timestamp: new Date(c.occurred_at).toISOString(),
      ...(c.uuid ? { uuid: c.uuid } : {}),
      properties,
    });
  }
  if (!batch.length) return { status: 'ok', sent: 0, dropped_pii, stripped, key_fp };

  const host = (env.POSTHOG_HOST || DEFAULT_HOST).replace(/\/+$/, '');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), o.timeoutMs ?? 3000);
  try {
    const res = await (o.fetch ?? fetch)(`${host}/batch/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: key, batch }),
      signal: ctl.signal,
    });
    const status = res.ok ? 'ok' : 'error';
    return { status, http: res.status, sent: res.ok ? batch.length : 0, dropped_pii, stripped, key_fp };
  } catch (err) {
    // The error NAME only: a message can echo a URL, and nothing here may echo the key.
    return { status: 'error', sent: 0, dropped_pii, stripped, key_fp, error: err instanceof Error ? err.name : 'error' };
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Straggler collector (PLAN.md §4.2): payload is the telemetry-client shape [{name, props, path, ts, sid}].
// ---------------------------------------------------------------------------

const MAX_BATCH = 50;
const MAX_BODY = 64 * 1024;

export async function collect(
  req: Request,
  o: { property: string; runtime: ForwardOptions['runtime']; env?: ForwardOptions['env']; fetch?: typeof fetch },
): Promise<Response> {
  // Refuse on the declared length before buffering anything. A chunked body can omit it, so the length check
  // after the read stays; the platform's own request-body cap (Vercel: 4.5 MB) bounds that case.
  if (Number(req.headers.get('content-length')) > MAX_BODY) return new Response(null, { status: 413 });
  let list: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY) return new Response(null, { status: 413 });
    list = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (!Array.isArray(list) || list.length > MAX_BATCH) return new Response(null, { status: 400 });

  const events: ContractEvent[] = list.map((r: any) => ({
    name: String(r?.name ?? ''),
    occurred_at: r?.ts == null ? new Date().toISOString() : new Date(r.ts).toString() === 'Invalid Date' ? '' : new Date(r.ts).toISOString(),
    distinct_id: String(r?.sid ?? ''),
    page_path: r?.path,
    props: r?.props,
  }));
  const result = await forward(events, {
    property: o.property,
    runtime: o.runtime,
    consent: req.headers.get('x-telemetry-consent') === 'granted',
    env: o.env,
    fetch: o.fetch,
  });
  if (!events.some((e) => e.name === 'instrumentation_check')) return new Response(null, { status: 204 });
  const http = 'http' in result ? result.http : undefined;
  const key_fp = 'key_fp' in result ? result.key_fp : undefined;
  return new Response(JSON.stringify({ posthog: result.status, key_fp, http }), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

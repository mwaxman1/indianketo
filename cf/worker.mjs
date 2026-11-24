// Worker wrapper for an Astro site with server routes (@astrojs/cloudflare build).
// Responsibilities, in order:
//  1. pin x-forwarded-host/proto (Vercel set them; Cloudflare forwards the client's)
//  2. /api/* -> the Astro server entry, untouched
//  3. everything else: serve dist/client exactly, then reproduce Vercel's three
//     path forms (/x, /x/, /x/index.html all 200) because html_handling is "none"
//  4. unmatched -> the exact 404 body production returns today
//  5. Vercel's static-response headers: HSTS, ACAO *, default cache-control
import app from '/home/mike/cf-fleet/work/indianketo-com-t_d0fddd06/dist/server/entry.mjs';
import NF from './404.mjs';
import CFG from './config.mjs';
import PUBLIC from './public-assets.mjs';

const HSTS = 'max-age=63072000';

function pin(request, url) {
  const r = new Request(request);
  r.headers.set('x-forwarded-host', url.host);
  r.headers.set('x-forwarded-proto', url.protocol.slice(0, -1));
  return r;
}

async function asset(request, url, env) {
  const p = url.pathname;
  const exact = await env.ASSETS.fetch(request);
  if (exact.status !== 404) return exact;
  const cands = [];
  if (p.endsWith('/index.html')) cands.push(p.slice(0, -'index.html'.length));
  else if (p.endsWith('/')) cands.push(p + 'index.html');
  else { cands.push(p + '/index.html'); cands.push(p + '.html'); }
  for (const c of cands) {
    const r = await env.ASSETS.fetch(new Request(new URL(c, url), { method: 'GET' }));
    if (r.status !== 404) return r;
  }
  return null;
}

// Vercel's content types carry a charset for text and JS; Cloudflare's asset layer
// does not. Same bytes, same declared encoding.
const CHARSET = new Set(['text/html', 'text/plain', 'text/css', 'text/javascript',
  'application/javascript', 'application/x-javascript', 'application/json']);

const FILE_CC = 'public, max-age=14400, must-revalidate';

function staticHeaders(res, pathname) {
  const out = new Response(res.body, res);
  out.headers.set('strict-transport-security', HSTS);
  // Vercel serves files copied from public/ with a 4h cache; /llms.txt is the
  // one measured exception (it revalidates every time).
  if (PUBLIC.has(pathname) && pathname !== '/llms.txt') out.headers.set('cache-control', FILE_CC);
  if (!out.headers.has('access-control-allow-origin')) out.headers.set('access-control-allow-origin', '*');
  const ct = (out.headers.get('content-type') || '').toLowerCase().trim();
  if (CHARSET.has(ct)) out.headers.set('content-type', ct + '; charset=utf-8');
  if (!out.headers.has('cache-control')) out.headers.set('cache-control', 'public, max-age=0, must-revalidate');
  return out;
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function notFound(url) {
  // Vercel's 404 page echoes the path it was asked for; substitute the real one.
  const body = NF.path ? NF.html.split(NF.path).join(esc(url.pathname)) : NF.html;
  return new Response(body, {
    status: 404,
    headers: {
      'content-type': 'text/html',
      'cache-control': 'public, max-age=0, must-revalidate',
      'strict-transport-security': HSTS,
    },
  });
}

function redirect(loc, status, withCacheControl) {
  const h = { location: loc, 'content-type': 'text/plain' };
  if (withCacheControl) h['cache-control'] = 'public, max-age=0, must-revalidate';
  if (status === 308) h['refresh'] = '0;url=' + loc;
  h['strict-transport-security'] = HSTS;
  return new Response(null, { status, headers: h });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const p = url.pathname;

    // Vercel's edge redirects, reproduced byte for byte: http -> https (308, no
    // HSTS because it never reaches a secure response) and www -> apex (307).
    if (url.protocol === 'http:') {
      const r = redirect('https://' + url.host + p + url.search, 308, false);
      r.headers.delete('strict-transport-security');
      return r;
    }
    if (CFG.wwwRedirect && url.hostname === 'www.' + CFG.wwwRedirect.to) {
      return redirect('https://' + CFG.wwwRedirect.to + p + url.search, CFG.wwwRedirect.status, true);
    }

    const pinned = pin(request, url);

    if (p.startsWith('/api/')) return app.fetch(pinned, env, ctx);

    if (request.method === 'GET' || request.method === 'HEAD') {
      const a = await asset(pinned, url, env);
      if (a) return staticHeaders(a, p);
    }

    const res = await app.fetch(pinned, env, ctx);
    if (res.status === 404) return notFound(url);
    return res;
  },
};

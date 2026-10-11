// KINK Switch now playing relay (Cloudflare Worker)
// Fetches "now playing" info for Studio Brussel server-side, where browser CORS rules do not apply,
// and returns it as JSON that the KINK Switch web app is allowed to read.
//
// GET /?station=stubru  ->  { station, icy, onair, at }
//   icy:   song info embedded in the audio stream (ICY StreamTitle), or null
//   onair: artist/title from the VRT playlist service, or null
// Add &debug=1 to also get raw snippets for troubleshooting.

const STATIONS = {
  stubru: {
    stream: 'https://icecast.vrtcdn.be/stubru-high.mp3',
    onair: 'https://services.vrt.be/playlist/onair?channel_code=41',
  },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'public, max-age=10',
  'Content-Type': 'application/json; charset=utf-8',
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    const id = url.searchParams.get('station') || 'stubru';
    const st = STATIONS[id];
    if (!st) return json({ error: 'unknown station' }, 404);
    const debug = url.searchParams.get('debug') === '1';

    // Short cache so many requests do not hammer VRT
    const cache = caches.default;
    const key = new Request(url.origin + '/?station=' + id + (debug ? '&debug=1' : ''));
    const hit = await cache.match(key);
    if (hit) return hit;

    const [icy, onair] = await Promise.all([readIcy(st.stream, debug), readOnair(st.onair, debug)]);
    const res = json({ station: id, icy, onair, at: Date.now() });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: CORS });
}

// Read the first ICY metadata block from the stream, then stop downloading
async function readIcy(streamUrl, debug) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(streamUrl, { headers: { 'Icy-MetaData': '1', 'User-Agent': 'KINK-Switch/1.0' }, signal: ctrl.signal });
    const metaint = parseInt(r.headers.get('icy-metaint') || '0', 10);
    if (!metaint) { ctrl.abort(); return debug ? { error: 'no icy-metaint header', status: r.status } : null; }
    const reader = r.body.getReader();
    let buf = new Uint8Array(0);
    while (buf.length < metaint + 1 + 255 * 16 && buf.length < 400000) {
      const { value, done } = await reader.read();
      if (done) break;
      const nb = new Uint8Array(buf.length + value.length);
      nb.set(buf); nb.set(value, buf.length); buf = nb;
      if (buf.length > metaint) {
        const len = buf[metaint] * 16;
        if (buf.length >= metaint + 1 + len) {
          ctrl.abort();
          if (!len) return debug ? { title: '', note: 'empty metadata block' } : { title: '' };
          const txt = new TextDecoder('utf-8').decode(buf.slice(metaint + 1, metaint + 1 + len)).replace(/\0+$/, '');
          const m = txt.match(/StreamTitle='(.*?)';/);
          const title = m ? m[1] : '';
          const split = title.split(' - ');
          const out = { title, artist: split.length > 1 ? split[0].trim() : '', song: split.length > 1 ? split.slice(1).join(' - ').trim() : '' };
          if (debug) out.raw = txt;
          return out;
        }
      }
    }
    ctrl.abort();
    return debug ? { error: 'no metadata block found' } : null;
  } catch (e) {
    return debug ? { error: String(e && e.message || e) } : null;
  } finally {
    clearTimeout(timer);
  }
}

// Ask the VRT playlist service and pull out artist and title
async function readOnair(onairUrl, debug) {
  try {
    const r = await fetch(onairUrl, { headers: { Accept: 'application/vnd.playlist.vrt.be.noa_1.0+json', 'User-Agent': 'KINK-Switch/1.0' } });
    const txt = await r.text();
    if (!r.ok) return debug ? { error: 'status ' + r.status, raw: txt.slice(0, 600) } : null;
    let data; try { data = JSON.parse(txt); } catch (e) { return debug ? { error: 'not json', raw: txt.slice(0, 600) } : null; }
    const found = pick(data);
    if (debug) found.raw = txt.slice(0, 1200);
    return found;
  } catch (e) {
    return debug ? { error: String(e && e.message || e) } : null;
  }
}

// Search an unknown JSON shape for artist and title (supports {key,value} pairs as used by VRT)
function pick(o) {
  let artist = '', title = '';
  (function walk(x, d) {
    if (!x || d > 8 || (artist && title)) return;
    if (Array.isArray(x)) { x.forEach(y => walk(y, d + 1)); return; }
    if (typeof x === 'object') {
      if (typeof x.key === 'string' && typeof x.value === 'string') {
        const k = x.key.toLowerCase();
        if (!artist && /artist|performer/.test(k)) artist = x.value;
        else if (!title && /^(title|songtitle|tracktitle|titel)$/.test(k)) title = x.value;
        return;
      }
      for (const [k0, v] of Object.entries(x)) {
        const k = k0.toLowerCase();
        if (typeof v === 'string' && v) {
          if (!artist && /artist|performer|artiest/.test(k)) artist = v;
          else if (!title && /^(title|songtitle|tracktitle|titel)$/.test(k)) title = v;
        } else walk(v, d + 1);
      }
    }
  })(o, 0);
  return { artist, title };
}

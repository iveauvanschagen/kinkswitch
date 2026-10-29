// Jaartal van het nummer op KINK, via MusicBrainz (gratis, zonder sleutel).
// MusicBrainz kent per opname de datum van de eerste uitgave: dus 1991 voor Pearl Jam - Black, niet het jaar van een remaster.
// Regels van MusicBrainz: maximaal één vraag per seconde. Gevonden jaren worden onthouden (de laatste 1000 nummers).
import { LOG } from '../log.js';
import { ls } from '../store.js';
import { mainArtist, norm, sleep } from '../util.js';

const MAX = 1000;
let cache = null;
const busy = new Map(); // nummers die nu worden opgezocht
let queue = Promise.resolve();
let lastAsk = 0;
let failLogged = false;

function load() {
  if (cache) return cache;
  try {
    cache = JSON.parse(ls('ks_years') || '{}');
  } catch (e) {
    cache = {};
  }
  return cache;
}

function save() {
  const keys = Object.keys(cache);
  // Oudste weggooien als het er te veel worden (volgorde van toevoegen blijft bewaard)
  if (keys.length > MAX) for (const k of keys.slice(0, keys.length - MAX)) delete cache[k];
  ls('ks_years', JSON.stringify(cache));
}

// Titel zonder toevoegingen als "(Live In Folsom Prison)" of "- 2012 Remaster"
function cleanTitle(t) {
  return (t || '')
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .trim();
}

function keyOf(artist, title) {
  return norm(mainArtist(artist)) + '|' + norm(cleanTitle(title));
}

// Bekend jaartal (getal), 0 = opgezocht maar niets gevonden, undefined = nog niet opgezocht
export function knownYear(artist, title) {
  return load()[keyOf(artist, title)];
}

async function ask(artist, title) {
  // Netjes wachten: nooit vaker dan één vraag per seconde
  const wait = lastAsk + 1100 - Date.now();
  if (wait > 0) await sleep(wait);
  lastAsk = Date.now();
  const a = mainArtist(artist),
    t = cleanTitle(title);
  const q = 'recording:"' + t.replace(/"/g, '') + '" AND artist:"' + a.replace(/"/g, '') + '"';
  const r = await fetch(
    'https://musicbrainz.org/ws/2/recording/?fmt=json&limit=10&query=' + encodeURIComponent(q),
    { headers: { Accept: 'application/json' } }
  );
  if (!r.ok) throw Error('MusicBrainz ' + r.status);
  const d = await r.json();
  const na = norm(a),
    nt = norm(t);
  // Alleen goede treffers: zelfde titel en de artiest komt voor. Daarvan het vroegste jaar.
  let best = 0;
  for (const rec of d.recordings || []) {
    if ((rec.score || 0) < 80 || norm(rec.title) !== nt) continue;
    const who = (rec['artist-credit'] || []).map(c => norm(c.name || c.artist?.name)).join(' ');
    if (!(' ' + who + ' ').includes(' ' + na + ' ')) continue;
    const y = parseInt((rec['first-release-date'] || '').slice(0, 4), 10);
    if (y > 1900 && (!best || y < best)) best = y;
  }
  return best;
}

// Jaartal opzoeken (of uit het geheugen halen). Geeft het jaar terug, of 0 als het niet gevonden is.
export function yearFor(artist, title) {
  if (!artist || !title) return Promise.resolve(0);
  const k = keyOf(artist, title),
    c = load();
  if (k in c) return Promise.resolve(c[k]);
  if (busy.has(k)) return busy.get(k);
  const p = (queue = queue.then(async () => {
    try {
      const y = await ask(artist, title);
      load()[k] = y;
      save();
      LOG('kink', 'info', 'Jaartal: ' + artist + ' - ' + title + ': ' + (y || 'niet gevonden'));
      failLogged = false;
      return y;
    } catch (e) {
      // Niet onthouden: volgende keer opnieuw proberen. Eén keer in de log, niet bij elk nummer.
      if (!failLogged) LOG('kink', 'warn', 'Jaartal opzoeken lukt niet: ' + e.message);
      failLogged = true;
      return 0;
    } finally {
      busy.delete(k);
    }
  }));
  busy.set(k, p);
  return p;
}

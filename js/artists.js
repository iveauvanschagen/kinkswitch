// Must hear (favorieten) en Must skip (banlijst).
import { S } from './state.js';
import { BAN_SUGGESTIONS, SUGGESTIONS } from './config.js';
import { ls } from './store.js';
import { msg } from './ui/status.js';
import { say } from './texts.js';
import { renderFavBtns, showKink } from './ui/tiles.js';
import { norm } from './util.js';

export function saveFavs(list) {
  ls('ks_favArtists', list.join('|'));
}

export function favList() {
  const v = ls('ks_favArtists');
  if (v === null) return [...SUGGESTIONS]; // eerste keer: Ivo's suggesties staan aan
  return v
    .split(v.includes('|') ? '|' : ',')
    .map(x => x.trim())
    .filter(Boolean);
}

// Hele woorden vergelijken, zodat "Muse" niet matcht op "Amusement"
export function isFav(artist) {
  const a = ' ' + norm(artist) + ' ';
  return favList().some(f => {
    const n = norm(f);
    return n && a.includes(' ' + n + ' ');
  });
}

export function toggleFav(artist) {
  if (!artist) return;
  const list = favList(),
    n = norm(artist),
    has = list.some(f => norm(f) === n);
  saveFavs(has ? list.filter(f => norm(f) !== n) : [...list, artist]);
  msg(say(has ? 'hearRemoved' : 'hearAdded', { band: artist }));
  S.lastFavKey = '';
  showKink();
  renderFavBtns();
}

export function banList() {
  const v = ls('ks_banArtists');
  if (v === null) return [...BAN_SUGGESTIONS];
  return v
    .split('|')
    .map(x => x.trim())
    .filter(Boolean);
}

export function saveBans(list) {
  ls('ks_banArtists', list.join('|'));
}

export function isBanned(artist) {
  const a = ' ' + norm(artist) + ' ';
  return banList().some(f => {
    const n = norm(f);
    return n && a.includes(' ' + n + ' ');
  });
}

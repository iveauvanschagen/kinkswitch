// KINK Catch: nummers van KINK bewaren in een eigen Spotify-playlist, en Gemist op KINK.
import { S } from './state.js';
import { CATCH_NAME } from './config.js';
import { metaUrl } from './kink/channel.js';
import { $ } from './dom.js';
import { ICON_ADD, ICON_CHECK } from './icons.js';
import { api } from './spotify/api.js';
import { connect, hasLogin } from './spotify/auth.js';
import { ls } from './store.js';
import { settings } from './ui/settings.js';
import { msg, toast } from './ui/status.js';
import { say } from './texts.js';
import { renderFavBtns } from './ui/tiles.js';
import { hhmm, mainArtist, norm, songKey } from './util.js';

export function caughtMap() {
  try {
    return JSON.parse(ls('ks_caught') || '{}');
  } catch (e) {
    return {};
  }
}

export function isCaught(artist, title) {
  return !!caughtMap()[songKey(artist, title)];
}

export function setCaught(artist, title, uri) {
  const m = caughtMap(),
    k = songKey(artist, title);
  if (uri) m[k] = uri;
  else delete m[k];
  ls('ks_caught', JSON.stringify(m));
}

export function needsModifyScope() {
  const sc = ls('ks_scope') || '';
  return !sc.includes('playlist-modify-private');
}

export async function catchPlaylistId() {
  let id = ls('ks_catchId');
  if (id) return id;
  // Bestaat hij al (bijvoorbeeld op een ander apparaat aangemaakt)? Dan die gebruiken.
  let url = '/me/playlists?limit=50';
  for (let i = 0; i < 4 && url; i++) {
    const d = await api(url);
    const f = (d?.items || []).find(p => p && p.name === CATCH_NAME);
    if (f) {
      ls('ks_catchId', f.id);
      return f.id;
    }
    url = d?.next ? d.next.replace('https://api.spotify.com/v1', '') : null;
  }
  const c = await api('/me/playlists', 'POST', {
    name: CATCH_NAME,
    public: false,
    description: 'Gevangen op KINK met KINK Switch',
  });
  ls('ks_catchId', c.id);
  return c.id;
}

export async function findTrack(artist, title) {
  const d = await api(
    '/search?type=track&limit=5&q=' + encodeURIComponent('track:' + title + ' artist:' + mainArtist(artist))
  );
  const items = d?.tracks?.items || [];
  const a = norm(mainArtist(artist));
  return items.find(t => (t.artists || []).some(x => norm(x.name) === a)) || items[0] || null;
}

export async function catchSong(artist, title, btn) {
  if (!hasLogin()) return settings('Sp');
  if (needsModifyScope()) {
    return toast(
      'Eén keer toestemming nodig',
      'Tik op Koppel om playlists te mogen aanpassen',
      async () => {
        $('clientId').value = ls('ks_client') || '';
        connect();
      },
      'Koppel'
    );
  }
  if (isCaught(artist, title)) return toast('Staat al in ' + CATCH_NAME, artist + ' - ' + title);
  btn?.classList.add('busy');
  try {
    const t = await findTrack(artist, title);
    if (!t) throw Error('Nummer niet gevonden op Spotify');
    let id = await catchPlaylistId();
    try {
      await api('/playlists/' + id + '/items', 'POST', { uris: [t.uri] });
    } catch (e) {
      ls('ks_catchId', null);
      id = await catchPlaylistId();
      await api('/playlists/' + id + '/items', 'POST', { uris: [t.uri] });
    }
    setCaught(artist, title, t.uri);
    renderFavBtns();
    renderMiss();
    const found = (t.artists || []).map(a => a.name).join(', ') + ' - ' + t.name;
    toast(say('caught'), found, async () => {
      try {
        await api('/playlists/' + id + '/items', 'DELETE', { items: [{ uri: t.uri }] });
      } catch (e) {
        try {
          await api('/playlists/' + id + '/items', 'DELETE', { tracks: [{ uri: t.uri }] });
        } catch (e2) {}
      }
      setCaught(artist, title, null);
      renderFavBtns();
      renderMiss();
      msg(say('released'));
    });
  } catch (e) {
    msg('Toevoegen mislukt: ' + e.message, true);
  }
  btn?.classList.remove('busy');
}

export async function loadMiss() {
  $('missList').innerHTML = '<p>Laden...</p>';
  try {
    const r = await fetch(metaUrl() + '&numberToFetch=50&_=' + Date.now(), { cache: 'no-store' });
    const x = new DOMParser().parseFromString(await r.text(), 'text/xml');
    S.missItems = [...x.querySelectorAll('nowplaying-info')]
      .map(el => {
        const p = {};
        el.querySelectorAll('property').forEach(q => (p[q.getAttribute('name')] = q.textContent));
        return {
          type: el.getAttribute('type'),
          start: +p.cue_time_start || 0,
          title: p.cue_title || '',
          artist: p.track_artist_name || '',
        };
      })
      .filter(i => i.type !== 'ad' && i.title && i.artist)
      .sort((a, b) => b.start - a.start)
      // Een deel van de items is reclame, jingle of presentator: ruim ophalen en de laatste 10 nummers tonen
      .slice(0, 10);
  } catch (e) {
    S.missItems = [];
  }
  renderMiss();
}

export function renderMiss() {
  const box = $('missList');
  if (!box) return;
  if (!S.missItems.length) {
    box.innerHTML = '<p>Nog geen nummers gevonden. Probeer het zo nog eens.</p>';
    return;
  }
  box.innerHTML = '';
  S.missItems.forEach(it => {
    const row = document.createElement('div');
    row.className = 'miss';
    const done = isCaught(it.artist, it.title);
    row.innerHTML =
      '<time></time><span style="min-width:0"><b></b><small></small></span><button class="ibtn' +
      (done ? ' done' : '') +
      '" aria-label="Toevoegen aan KINK Catch">' +
      (done ? ICON_CHECK : ICON_ADD) +
      '</button>';
    row.querySelector('time').textContent = hhmm(it.start);
    row.querySelector('b').textContent = it.artist;
    row.querySelector('small').textContent = it.title;
    const b = row.querySelector('button');
    b.onclick = () => catchSong(it.artist, it.title, b);
    box.appendChild(row);
  });
}

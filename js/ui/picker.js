// Playlist kiezen, een link plakken of een playlist delen vanuit Spotify.
import { S } from '../state.js';
import { CATCH_NAME } from '../config.js';
import { $ } from '../dom.js';
import { LOGO_SVG } from '../icons.js';
import { api } from '../spotify/api.js';
import { connect, hasLogin } from '../spotify/auth.js';
import { goSpotify } from '../spotify/player.js';
import { ls } from '../store.js';
import { settings } from './settings.js';
import { msg } from './status.js';
import { renderSpotIdle, showTab } from './tiles.js';

export function setPlaylist(uri, name, total) {
  ls('ks_playlist', uri);
  ls('ks_playlistName', name || 'Je playlist');
  ls('ks_playlistTotal', total > 0 ? String(total) : null);
  S.spQueued = null;
  renderSpotIdle();
  $('plModal').classList.remove('show');
  msg('Playlist gekozen: ' + (name || 'je playlist'));
  if (S.mode === 'spotify') goSpotify();
}

export async function nameOf(uri) {
  try {
    const d = await api('/playlists/' + uri.split(':').pop() + '?fields=name');
    return d?.name || '';
  } catch (e) {
    return '';
  }
}

export async function setFromLink(text) {
  const m = (text || '').match(
    /(?:open\.spotify\.com\/(?:intl-[a-z]+\/)?playlist\/|spotify:playlist:)([A-Za-z0-9]+)/
  );
  if (!m) {
    msg('Dat is geen Spotify-playlistlink. Kopieer de link via Delen in de Spotify-app.', true);
    return false;
  }
  const uri = 'spotify:playlist:' + m[1];
  setPlaylist(uri, hasLogin() ? await nameOf(uri) : '');
  return true;
}

export async function openPicker() {
  $('plModal').classList.add('show');
  $('toast').hidden = true;
  showTab('play');
  const box = $('plList');
  if (!hasLogin()) {
    box.innerHTML = '<p>Koppel eerst Spotify via het tandwiel.</p>';
    return;
  }
  const sc = ls('ks_scope');
  if (!sc || !sc.includes('playlist-read-private')) {
    box.innerHTML =
      '<p>Om je eigen playlists hier te tonen, heeft de app één keer extra toestemming nodig.</p><button class="btn bigbtn" id="regrant">Geef toegang tot mijn playlists</button>';
    $('regrant').onclick = () => {
      $('clientId').value = ls('ks_client') || '';
      connect();
    };
    return;
  }
  box.innerHTML = '<p>Playlists laden...</p>';
  try {
    let url = '/me/playlists?limit=50',
      all = [];
    for (let i = 0; i < 4 && url; i++) {
      const d = await api(url);
      all = all.concat(d?.items || []);
      url = d?.next ? d.next.replace('https://api.spotify.com/v1', '') : null;
    }
    if (!all.length) {
      box.innerHTML = '<p>Geen playlists gevonden. Gebruik de knop Plak hierboven.</p>';
      return;
    }
    const cur = ls('ks_playlist');
    box.innerHTML = '';
    const catchId = ls('ks_catchId');
    const mine = all.filter(Boolean).find(p => p.id === catchId || p.name === CATCH_NAME);
    if (mine) {
      if (!catchId) ls('ks_catchId', mine.id);
      const h = document.createElement('div');
      h.className = 'pin';
      h.textContent = 'JOUW KINK-PLAYLIST';
      box.appendChild(h);
      const b = document.createElement('button');
      b.className = 'pl mine' + (mine.uri === cur ? ' cur' : '');
      const n = mine.items?.total ?? mine.tracks?.total;
      b.innerHTML =
        '<span class="cov">' +
        LOGO_SVG +
        '</span><span style="min-width:0"><b></b><small></small></span>' +
        (mine.uri === cur ? '<span class="ok">GEKOZEN</span>' : '<span></span>');
      b.querySelector('b').textContent = mine.name;
      b.querySelector('small').textContent =
        (n != null ? n + (n === 1 ? ' nummer, ' : ' nummers, ') : '') + 'gevangen met KINK Switch';
      b.onclick = () => setPlaylist(mine.uri, mine.name, mine.items?.total ?? mine.tracks?.total);
      box.appendChild(b);
      const h2 = document.createElement('div');
      h2.className = 'pin dim';
      h2.textContent = 'JOUW PLAYLISTS';
      box.appendChild(h2);
    }
    all
      .filter(p => p && p !== mine)
      .forEach(pl => {
        const b = document.createElement('button');
        b.className = 'pl' + (pl.uri === cur ? ' cur' : '');
        const img = pl.images?.[pl.images.length > 1 ? 1 : 0]?.url || pl.images?.[0]?.url;
        b.innerHTML =
          (img ? '<img alt="" src="' + img + '">' : '<span class="ph"></span>') +
          '<span style="min-width:0"><b></b><small></small></span>' +
          (pl.uri === cur ? '<span class="ok">GEKOZEN</span>' : '<span></span>');
        b.querySelector('b').textContent = pl.name;
        b.querySelector('small').textContent = pl.owner?.display_name || '';
        b.onclick = () => setPlaylist(pl.uri, pl.name, pl.items?.total ?? pl.tracks?.total);
        box.appendChild(b);
      });
  } catch (e) {
    if (/403|401|scope|Insufficient/i.test(e.message)) {
      box.innerHTML =
        '<p>Om je eigen playlists hier te tonen, heeft de app één keer extra toestemming nodig.</p><button class="btn bigbtn" id="regrant">Geef toegang tot mijn playlists</button>';
      $('regrant').onclick = () => {
        $('clientId').value = ls('ks_client') || '';
        connect();
      };
    } else box.innerHTML = '<p>Laden mislukt: ' + e.message + '</p>';
  }
}

// Binnenkomend via een link of via Delen vanuit Spotify
export async function incoming() {
  const q = new URLSearchParams(location.search);
  const client = q.get('client'),
    shared = [q.get('text'), q.get('url'), q.get('title')].filter(Boolean).join(' ');
  if (!client && !shared) return;
  history.replaceState({}, document.title, location.pathname);
  if (client && /^[0-9a-f]{32}$/i.test(client)) {
    ls('ks_client', client);
    if (!hasLogin()) {
      msg('Bijna klaar: tik op Koppel Spotify.');
      settings('Sp');
    }
  }
  if (shared) await setFromLink(shared);
}

// Knoppen en invoervelden koppelen
export function bindPicker() {
  $('tabPlay').onclick = () => showTab('play');

  $('tabMiss').onclick = () => showTab('miss');

  $('plBtn').onclick = openPicker;

  $('closePl').onclick = () => $('plModal').classList.remove('show');

  $('pastePl').onclick = async () => {
    try {
      const t = await navigator.clipboard.readText();
      await setFromLink(t);
    } catch (e) {
      const t = prompt('Plak hier de Spotify-link');
      if (t) setFromLink(t);
    }
  };
}

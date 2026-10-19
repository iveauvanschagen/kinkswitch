// Spotify afspelen: apparaat kiezen, playlist starten, controleren of hij echt speelt, shuffle.
import { S } from '../state.js';
import { IS_PHONE, SILLY_ALBUM } from '../config.js';
import { $, radio } from '../dom.js';
import { LOG } from '../log.js';
import { aborted, api } from './api.js';
import { hasLogin } from './auth.js';
import { spActive } from './keepawake.js';
import { clearSpIssue, handleSpError } from './reach.js';
import { ls } from '../store.js';
import { setAway } from '../switcher.js';
import { openPicker } from '../ui/picker.js';
import { settings } from '../ui/settings.js';
import { msg } from '../ui/status.js';
import {
  renderFavBtns,
  renderSpIssue,
  renderSpotIdle,
  setMode,
  setPP,
  updateMediaInfo,
} from '../ui/tiles.js';
import { sleep } from '../util.js';

// Wekt een Spotify-apparaat dat niet actief is: eerst de weergave erheen overzetten, dan pas afspelen.
export async function wakeDevice(id) {
  const dev = S.lastDevList.find(x => x.id === id);
  if (!dev || dev.is_active) return;
  LOG('device', 'info', 'Apparaat ' + dev.name + ' is niet actief, weergave wordt overgezet');
  try {
    await api('/me/player', 'PUT', { device_ids: [id], play: false });
    await sleep(700);
  } catch (e) {
    LOG('device', 'warn', 'Overzetten mislukt: ' + e.message);
  }
}

export async function spDevices() {
  const d = await api('/me/player/devices');
  S.lastDevList = d?.devices || [];
  if (S.lastDevList.length && S.spIssue === 'nodevice') clearSpIssue(false);
  LOG(
    'device',
    'info',
    'Apparaten: ' +
      (S.lastDevList
        .map(
          x =>
            x.name +
            ' (' +
            x.type +
            (x.is_active ? ', actief' : '') +
            (x.is_restricted ? ', beperkt' : '') +
            ')'
        )
        .join(', ') || 'geen')
  );
  return S.lastDevList;
}

// Kiest het apparaat: een vast gekozen apparaat, anders een van dezelfde soort (telefoon of computer)
export function pickDevice(list) {
  const pick = ls('ks_device');
  let dev = pick && list.find(x => x.id === pick);
  if (!dev) {
    const kind = IS_PHONE ? ['Smartphone', 'Tablet'] : ['Computer'];
    const same = list.filter(x => kind.includes(x.type));
    const last = ls('ks_myDevice');
    dev =
      same.find(x => x.id === last) ||
      same.find(x => x.is_active) ||
      same[0] ||
      list.find(x => x.is_active) ||
      list[0];
  }
  return dev || null;
}

export async function deviceId() {
  const list = await spDevices();
  if (!list.length) {
    // Spotify geeft soms even een lege lijst. Het laatst gebruikte apparaat toch proberen; de controle na afspelen beslist.
    const last = ls('ks_myDevice');
    if (last) {
      LOG('device', 'warn', 'Geen apparaten gemeld, laatst gebruikte apparaat toch proberen');
      return last;
    }
    throw Error('Geen Spotify-apparaat gevonden. Open de Spotify-app op je telefoon en probeer opnieuw.');
  }
  const pick = ls('ks_device'),
    dev = pickDevice(list);
  ls('ks_myDevice', dev.id);
  ls('ks_myDeviceName', dev.name + '|' + dev.type);
  LOG(
    'device',
    'info',
    'Gekozen: ' + dev.name + ' (' + dev.type + ')' + (pick ? ' via instelling' : ' automatisch')
  );
  return dev.id;
}

export async function ownsSpotify() {
  let p = null;
  try {
    p = await api('/me/player');
  } catch (e) {
    LOG(
      'switch',
      'info',
      'Spotify-status onbekend (' +
        e.message +
        '), ' +
        (S.iStarted ? 'deze kopie startte Spotify' : 'niet door deze kopie gestart')
    );
    return S.iStarted;
  }
  // Spotify meldt soms "niets actief" terwijl de app op de achtergrond gewoon speelt. Dan vertrouwen we op wat wij zelf deden.
  if (!p || !p.device) {
    LOG(
      'switch',
      'info',
      'Spotify meldt geen actieve weergave, ' +
        (S.iStarted ? 'maar deze kopie startte Spotify: gaat door' : 'en deze kopie startte niets')
    );
    return S.iStarted;
  }
  const d = p.device,
    idMatch = d.id === ls('ks_myDevice');
  // Spotify geeft hetzelfde apparaat soms een ander ID. Naam en type tellen dan ook, maar alleen als deze kopie Spotify startte.
  const nameMatch = S.iStarted && d.name + '|' + d.type === ls('ks_myDeviceName');
  if (!idMatch && nameMatch)
    LOG(
      'switch',
      'info',
      'Ander ID maar zelfde apparaat (' + d.name + '), deze kopie startte Spotify: gaat door'
    );
  if (!idMatch && !nameMatch)
    LOG(
      'switch',
      'info',
      'Spotify speelt op ' +
        (d.name || 'ander apparaat') +
        ' (' +
        d.type +
        ', id ' +
        String(d.id || '?').slice(0, 8) +
        ', mijn id ' +
        String(ls('ks_myDevice') || '?').slice(0, 8) +
        ')'
    );
  return idMatch || nameMatch || (S.iStarted && !p.is_playing);
}

export function playlistUri() {
  return toUri(ls('ks_playlist') || '');
}

export function toUri(s) {
  s = (s || '').trim();
  if (s.startsWith('spotify:playlist:')) return s;
  try {
    const u = new URL(s),
      m = u.pathname.match(/playlist\/([A-Za-z0-9]+)/);
    if (m && u.hostname.endsWith('spotify.com')) return 'spotify:playlist:' + m[1];
  } catch (e) {}
  return '';
}

// Speelt de playlist. Stond hij al eerder op, dan gaat hij verder waar hij was in plaats van opnieuw te beginnen.
// Aantal nummers in een playlist. Eerst uit wat we bij het kiezen al wisten, anders opvragen.
export async function playlistTotal(uri) {
  if (ls('ks_playlist') === uri && Number(ls('ks_playlistTotal')) > 0) return Number(ls('ks_playlistTotal'));
  const id = uri.split(':').pop();
  for (const f of ['items.total', 'tracks.total']) {
    try {
      const d = await api('/playlists/' + id + '?fields=' + f);
      const t = d?.items?.total ?? d?.tracks?.total ?? 0;
      if (t > 0) {
        ls('ks_playlistTotal', String(t));
        return t;
      }
    } catch (e) {}
  }
  return 0;
}

// Spotify zet shuffle uit zodra een nieuwe playlist start. Daarom pas na het starten aanzetten,
// even wachten tot de speler de nieuwe playlist heeft geladen en controleren of het gelukt is.
export async function ensureShuffle(dev) {
  for (let i = 0; i < 4; i++) {
    await sleep(i === 0 ? 900 : 1300);
    try {
      await api('/me/player/shuffle?state=true&device_id=' + encodeURIComponent(dev), 'PUT');
    } catch (e) {}
    await sleep(400);
    try {
      const p = await api('/me/player');
      if (p?.shuffle_state) return true;
    } catch (e) {}
  }
  return false;
}

export async function playList() {
  const wasKink = S.mode === 'kink' && !radio.paused;
  try {
    return await playListInner();
  } catch (e) {
    if (/^Afgebroken/.test(e.message)) throw e;
    LOG('switch', 'err', 'Naar Spotify mislukt: ' + e.message);
    // Nooit stilte: speelde KINK, dan gaat KINK gewoon door
    if (wasKink || S.mode === 'spotify') {
      S.iStarted = false;
      radio.load();
      radio
        .play()
        .then(() => {
          setMode('kink');
          setPP(true);
        })
        .catch(() => {});
    }
    throw e;
  }
}

export async function playListInner() {
  const context = playlistUri();
  if (!context) {
    openPicker();
    throw Error('Kies eerst een playlist');
  }
  const dev = await deviceId();
  let resume = false,
    before = null;
  try {
    before = await api('/me/player');
    resume = before?.context?.uri === context;
  } catch (e) {}
  const plName = ls('ks_playlistName') || 'je playlist';
  if (resume) {
    LOG(
      'spotify',
      'info',
      `Spotify: verder in ${plName}` +
        (before.item ? ` met ${artistsOf(before.item)} - ${before.item.name}` : '')
    );
  } else {
    LOG(
      'spotify',
      'info',
      `Spotify: ${plName} nieuw gestart${ls('ks_shuffle') !== '0' ? ' op een willekeurig nummer' : ''} (Spotify had: ${describeContext(before)})`
    );
  }
  // Nieuw gestart: pas een nummer tonen als Spotify meldt dat het uit je playlist komt
  S.spExpect = resume ? null : context;
  radio.pause();
  const shuffle = ls('ks_shuffle') !== '0';
  let body = resume ? undefined : { context_uri: context },
    randomStart = false;
  // Nieuw gestart met shuffle: begin op een willekeurig nummer in plaats van altijd het eerste
  if (body && shuffle) {
    const t = await playlistTotal(context);
    if (t > 1) {
      body.offset = { position: Math.floor(Math.random() * t) };
      randomStart = true;
    }
  }
  await wakeDevice(dev);
  try {
    await api('/me/player/play?device_id=' + encodeURIComponent(dev), 'PUT', body);
  } catch (e) {
    if (body?.offset) {
      delete body.offset;
      randomStart = false;
      await api('/me/player/play?device_id=' + encodeURIComponent(dev), 'PUT', body);
    } else throw e;
  }
  setMode('spotify');
  setPP(true);
  S.iStarted = true;
  spActive();
  const seq = S.kinkSeq;
  if (!(await verifySpotify())) {
    // Intussen zelf KINK gekozen? Dan is er niets mis, gewoon stoppen.
    if (seq !== S.kinkSeq) {
      LOG('switch', 'info', 'Intussen KINK gekozen, Spotify-controle gestopt');
      throw Error('Afgebroken: KINK gekozen');
    }
    throw Error('Geen Spotify-apparaat gevonden: Spotify meldt geen nummer. Open de Spotify-app.');
  }
  if (shuffle) {
    const ok = await ensureShuffle(dev);
    // Lengte van de playlist onbekend? Dan na het aanzetten van shuffle één keer doorspringen naar een willekeurig nummer.
    if (ok && body && !randomStart) {
      try {
        await api('/me/player/next?device_id=' + encodeURIComponent(dev), 'POST');
      } catch (e) {}
    }
    if (!ok) msg('Shuffle aanzetten lukte niet. Zet het eventueel aan in de Spotify-app.', true);
  }
}

// Kijkt tot ongeveer 4 seconden of Spotify een nummer meldt. Pas dan weten we dat het wisselen gelukt is.
// Namen van de artiesten van een nummer
export function artistsOf(item) {
  return (item?.artists || []).map(a => a.name).join(', ');
}

// Onthoud welk nummer uit je gekozen playlist klaarstaat. Iets anders (of niets) telt niet.
export function noteQueued(p) {
  const ctx = playlistUri();
  S.spQueued =
    p?.item && ctx && p.context?.uri === ctx ? { artist: artistsOf(p.item), title: p.item.name } : null;
}

// Vraag Spotify wat er klaarstaat (voor de tegel)
export async function readQueued() {
  try {
    noteQueued(await api('/me/player'));
  } catch (e) {}
}

// Wat had Spotify klaarstaan, in gewone woorden (voor de log)
function describeContext(p) {
  const uri = p?.context?.uri;
  if (!p || !p.item) return 'niets';
  if (!uri) return 'een los nummer zonder playlist';
  if (uri === SILLY_ALBUM) return "Don't be silly";
  if (uri.includes(':playlist:')) return 'een andere playlist';
  if (uri.includes(':album:')) return 'een album';
  return uri;
}

export async function verifySpotify() {
  for (let i = 0; i < 4; i++) {
    await sleep(i === 0 ? 500 : 1200);
    let p = null;
    try {
      p = await api('/me/player');
    } catch (e) {}
    // Nieuw gestart en Spotify meldt nog het oude nummer? Even wachten, niet tonen.
    if (p && p.item && S.spExpect && p.context?.uri !== S.spExpect && i < 3) {
      LOG('spotify', 'info', 'Spotify meldt nog het vorige nummer, even wachten');
      continue;
    }
    if (p && p.item) {
      const artist = artistsOf(p.item);
      LOG(
        'spotify',
        'ok',
        'Spotify speelt: ' +
          artist +
          ' - ' +
          p.item.name +
          (p.is_playing ? '' : ' (gepauzeerd)') +
          ' op ' +
          (p.device?.name || '?')
      );
      noteQueued(p);
      if (S.spExpect && p.context?.uri !== S.spExpect) {
        // Spotify speelt wel, maar meldt (nog) niet onze playlist: geen oud nummer tonen
        $('spotLabel').textContent = 'NU OP SPOTIFY';
        $('spotArtist').textContent = ls('ks_playlistName') || 'Je playlist';
        $('spotSong').textContent = '';
        clearSpIssue(false);
        return true;
      }
      S.spExpect = null;
      S.spotNow = { title: p.item.name, artist, main: (p.item.artists || [])[0]?.name || '' };
      S.lastSpotKey = p.item.id || p.item.name;
      $('spotLabel').textContent = 'NU OP SPOTIFY';
      $('spotArtist').textContent = artist;
      $('spotSong').textContent = p.item.name;
      updateMediaInfo();
      renderFavBtns();
      clearSpIssue(false);
      return true;
    }
    LOG('spotify', 'warn', 'Spotify meldt nog geen nummer (poging ' + (i + 1) + ' van 4)');
  }
  return false;
}

export async function goSpotify() {
  if (S.goBusy) {
    LOG('switch', 'info', 'Spotify-tegel nog een keer ingedrukt, wordt genegeerd');
    return;
  }
  LOG('switch', 'info', 'Spotify-tegel ingedrukt');
  if (!hasLogin()) return settings('Sp');
  S.goBusy = true;
  setAway(0); // handmatig gekozen: niet automatisch terug
  try {
    msg('Spotify start...');
    await playList();
    if (!$('status').classList.contains('err'))
      msg('Spotify speelt je playlist' + (ls('ks_shuffle') !== '0' ? ' op shuffle' : ''));
  } catch (e) {
    if (!aborted(e)) {
      msg(e.message, true);
      handleSpError(e, { kind: 'tap' });
    }
  } finally {
    S.goBusy = false;
  }
}

export async function toggle() {
  try {
    const d = await api('/me/player');
    if (d?.is_playing) {
      await api('/me/player/pause', 'PUT');
      setPP(false);
      msg('Spotify gepauzeerd');
    } else {
      await api('/me/player/play', 'PUT');
      setPP(true);
      setMode('spotify');
      msg('Spotify speelt');
    }
  } catch (e) {
    msg(e.message, true);
  }
}

export async function next() {
  try {
    await api('/me/player/next', 'POST');
    setMode('spotify');
    msg('Volgend nummer');
  } catch (e) {
    msg(e.message, true);
  }
}

export async function pollSpotify() {
  if (S.spIssue && S.mode !== 'spotify') return renderSpIssue();
  if (S.mode !== 'spotify' || document.visibilityState !== 'visible' || !hasLogin()) return renderSpotIdle();
  try {
    const p = await api('/me/player');
    const it = p?.item;
    if (!it) {
      // Spotify meldt even geen nummer: laat het laatst bekende staan, of anders je playlist
      if (S.mode === 'spotify') {
        $('spotLabel').textContent = 'NU OP SPOTIFY';
        if (!S.spotNow) {
          $('spotArtist').textContent = ls('ks_playlistName') || 'Je playlist';
          $('spotSong').textContent = '';
        }
        return;
      }
      return renderSpotIdle();
    }
    if (S.spIssue === 'nodevice') clearSpIssue(false);
    if (p.is_playing) spActive();
    noteQueued(p);
    if (S.spExpect && p.context?.uri !== S.spExpect) return; // je playlist is nog niet geladen
    S.spExpect = null;
    $('spotLabel').textContent = p.is_playing ? 'NU OP SPOTIFY' : 'GEPAUZEERD';
    $('spotArtist').textContent = (it.artists || []).map(a => a.name).join(', ');
    $('spotSong').textContent = it.name;
    S.spotNow = {
      title: it.name,
      artist: (it.artists || []).map(a => a.name).join(', '),
      main: (it.artists || [])[0]?.name || '',
    };
    updateMediaInfo();
    renderFavBtns();
    const k = it.id || it.name;
    if (k !== S.lastSpotKey) {
      S.lastSpotKey = k;
      LOG(
        'spotify',
        'info',
        'Spotify speelt: ' + S.spotNow.artist + ' - ' + it.name + (p.is_playing ? '' : ' (gepauzeerd)')
      );
    }
  } catch (e) {}
}

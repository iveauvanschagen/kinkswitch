// De twee grote tegels (KINK en Spotify), de afspeelknop en wat er in de melding van Android staat.
import { S } from '../state.js';
import { isFav, toggleFav } from '../artists.js';
import { catchSong, isCaught, loadMiss } from '../catch.js';
import { $, radio } from '../dom.js';
import { ICON_ADD, ICON_CHECK } from '../icons.js';
import { kinkTap } from '../kink/radio.js';
import { wantKink } from '../kink/watch.js';
import { knownYear, yearFor } from '../kink/year.js';
import { silly } from '../silly.js';
import { goSpotify, next, pollSpotify, toggle } from '../spotify/player.js';
import { fixSpotify } from '../spotify/reach.js';
import { ls } from '../store.js';
import { checkFav, setAway, skipSong, tick } from '../switcher.js';
import { msg, setSw } from './status.js';
import { mainArtist } from '../util.js';

// De Auto-knop is weg (v1.5.0). Aan en uit zetten gaat via Instellingen; hier valt niets meer te tonen.
export function renderAuto() {}

export function setPP(playing) {
  $('playPause').innerHTML = playing
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg><span>Pauze</span>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z"/></svg><span>Afspelen</span>';
}

export function setMode(m) {
  S.mode = m;
  const live = m === 'kink' && !radio.paused;
  $('kinkMode').classList.toggle('active', m === 'kink');
  $('kinkMode').classList.toggle('live', live);
  $('spotifyMode').classList.toggle('active', m === 'spotify');
  $('state').textContent = live ? 'LIVE' : m === 'kink' ? 'PAUZE' : 'UIT';
  $('spotTag').textContent = m === 'spotify' ? 'SPEELT' : 'PLAYLIST';
  if (S.spIssue) {
    renderSpIssue();
    updateMediaInfo();
    return;
  }
  if (m === 'spotify') {
    $('kinkMode').classList.remove('fresh');
    $('spotifyMode').classList.remove('ready');
    setTimeout(pollSpotify, 1500);
  } else renderSpotIdle();
  updateMediaInfo();
}

export function renderSpIssue() {
  const t = $('spotifyMode');
  t.classList.toggle('issue', !!S.spIssue);
  if (!S.spIssue) return;
  $('spotTag').textContent = 'LET OP';
  $('spotLabel').textContent = S.spIssue === 'login' ? 'KOPPELING VERLOPEN' : 'SPOTIFY STAAT NIET AAN';
  $('spotArtist').textContent =
    S.spIssue === 'login'
      ? 'Tik om opnieuw te koppelen'
      : S.spWatchUntil
        ? 'Even kijken...'
        : 'Tik om Spotify te openen';
  $('spotSong').textContent = 'KINK speelt gewoon door';
  $('spotFav').hidden = true;
}

export function blinkSpotify() {
  const t = $('spotifyMode');
  t.classList.remove('blink');
  void t.offsetWidth;
  t.classList.add('blink');
  setTimeout(() => t.classList.remove('blink'), 3200);
}

export function updateMediaInfo() {
  let title = 'KINK live',
    artist = 'KINK';
  if (S.mode === 'spotify' && S.spotNow) {
    title = S.spotNow.title;
    artist = S.spotNow.artist || 'Spotify';
  } else if (S.mode === 'kink' && S.kinkNow) {
    if (S.kinkNow.isBreak) {
      title = 'Reclame of nieuws';
      artist = 'KINK';
    } else if (S.kinkNow.title) {
      title = S.kinkNow.title;
      artist = S.kinkNow.artist || 'KINK';
    }
  }
  document.title = title === 'KINK live' ? 'KINK Switch' : title + ' - ' + artist;
  if ('mediaSession' in navigator && S.mode === 'kink') {
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: 'KINK live',
        artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
      });
    } catch (e) {}
  }
}

export function showKink() {
  if (!S.kinkNow) return;
  updateMediaInfo();
  if (S.kinkNow.isBreak || !S.kinkNow.title) {
    $('kinkArtist').textContent = S.kinkNow.isBreak ? 'Reclame of nieuws' : 'Presentator of jingle';
    $('kinkSong').textContent = '';
    renderFavBtns();
    $('kinkGenre').textContent = '';
    $('kinkMode').classList.remove('fav');
    S.lastFavKey = '';
    return;
  }
  $('kinkArtist').textContent = S.kinkNow.artist || S.kinkNow.title;
  $('kinkSong').textContent = S.kinkNow.artist ? S.kinkNow.title : '';
  renderFavBtns();
  const key = S.kinkNow.artist + S.kinkNow.title;
  if (key !== S.lastFavKey) {
    S.lastFavKey = key;
    checkFav(S.kinkNow.artist, key);
  }
  showYear(S.kinkNow.artist, S.kinkNow.title);
  // Nieuw nummer op KINK terwijl je naar Spotify luistert: tegel licht even op
  if (S.lastKinkSong && key !== S.lastKinkSong && S.mode === 'spotify') {
    $('kinkMode').classList.add('fresh');
    setTimeout(() => $('kinkMode').classList.remove('fresh'), 6000);
  }
  S.lastKinkSong = key;
}

export function renderFavBtns() {
  const kb = $('kinkFav'),
    sb = $('spotFav');
  const ka =
    S.kinkNow && !S.kinkNow.isBreak && S.kinkNow.title && S.kinkNow.artist
      ? mainArtist(S.kinkNow.artist)
      : '';
  kb.hidden = !ka;
  if (ka) kb.classList.toggle('on', isFav(ka));
  const sa = S.mode === 'spotify' && S.spotNow ? S.spotNow.main : '';
  sb.hidden = !sa;
  if (sa) sb.classList.toggle('on', isFav(sa));
  const ab = $('kinkAdd'),
    ok = S.kinkNow && !S.kinkNow.isBreak && S.kinkNow.title;
  ab.hidden = !ok;
  if (ok) {
    const done = isCaught(S.kinkNow.artist, S.kinkNow.title);
    ab.classList.toggle('done', done);
    ab.innerHTML = done ? ICON_CHECK : ICON_ADD;
  }
}

export function showTab(t) {
  $('tabPlay').classList.toggle('on', t === 'play');
  $('tabMiss').classList.toggle('on', t === 'miss');
  $('panePlay').hidden = t !== 'play';
  $('paneMiss').hidden = t !== 'miss';
  if (t === 'miss') loadMiss();
}

export function renderSpotIdle() {
  $('spotifyMode').classList.toggle('ready', !!S.spReady && !S.spIssue && S.mode !== 'spotify');
  if (S.spIssue) return renderSpIssue();
  if (S.mode === 'spotify') return;
  const pl = ls('ks_playlistName') || (ls('ks_playlist') ? 'Je playlist' : 'Kies een playlist');
  if (S.spQueued) {
    // Spotify gaat verder met dit nummer uit je playlist
    $('spotTag').textContent = S.spReady ? 'KLAAR' : 'PLAYLIST';
    $('spotLabel').textContent = 'VERDER MET';
    $('spotArtist').textContent = S.spQueued.artist;
    $('spotSong').textContent = S.spQueued.title;
  } else if (S.spReady) {
    $('spotTag').textContent = 'KLAAR';
    $('spotLabel').textContent = 'KLAAR OP ' + S.spReady.toUpperCase();
    $('spotArtist').textContent = pl;
    $('spotSong').textContent =
      ls('ks_shuffle') !== '0' ? 'Start op een willekeurig nummer' : 'Tik om te wisselen';
  } else {
    $('spotTag').textContent = 'PLAYLIST';
    $('spotLabel').textContent = 'PLAYLIST';
    $('spotArtist').textContent = pl;
    $('spotSong').textContent = '';
  }
  S.spotNow = null;
  renderFavBtns();
}

// Knoppen en invoervelden koppelen
export function bindHome() {
  $('kinkFav').onclick = e => {
    e.stopPropagation();
    if (S.kinkNow?.artist) toggleFav(mainArtist(S.kinkNow.artist));
  };

  $('spotFav').onclick = e => {
    e.stopPropagation();
    if (S.spotNow?.main) toggleFav(S.spotNow.main);
  };

  $('kinkAdd').onclick = e => {
    e.stopPropagation();
    if (S.kinkNow?.title) catchSong(S.kinkNow.artist, S.kinkNow.title, $('kinkAdd'));
  };

  $('silly').onclick = silly;

  $('playPause').onclick = () => (S.mode === 'spotify' ? toggle() : radio.paused ? kinkTap() : pauseKink());

  $('kinkMode').onclick = kinkTap;

  $('spotifyMode').onclick = () => (S.spIssue ? fixSpotify() : goSpotify());

  // Volgende: op Spotify het volgende nummer, op KINK alleen dit nummer overslaan
  $('next').onclick = nextTap;


  radio.onplaying = () => {
    setMode('kink');
    setPP(true);
  };

  radio.onpause = () => {
    if (S.keepPausing) return;
    if (S.mode === 'kink') {
      setPP(false);
      setMode('kink');
    }
  };

  // Stuurwielknoppen en vergrendelscherm: "volgende" tijdens KINK slaat het nummer over
  if ('mediaSession' in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: 'KINK live',
      artist: 'KINK Switch',
      artwork: [{ src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', kinkTap);
    navigator.mediaSession.setActionHandler('pause', pauseKink);
    navigator.mediaSession.setActionHandler('nexttrack', nextTap);
  }
}

export function nextTap() {
  if (S.mode === 'spotify') return next().then(() => setTimeout(pollSpotify, 800));
  return skipSong();
}

// Zelf KINK pauzeren: de bewaker hoeft dan niet opnieuw te verbinden
export function pauseKink() {
  wantKink(false);
  radio.pause();
}

// Jaartal als label naast de artiest op de KINK-tegel (via MusicBrainz, onthouden per nummer)
function showYear(artist, title) {
  const tag = $('kinkGenre');
  const y = knownYear(artist, title);
  if (y !== undefined) {
    tag.textContent = y ? String(y) : '';
    return;
  }
  tag.textContent = '';
  yearFor(artist, title).then(v => {
    if (v && S.kinkNow && S.kinkNow.artist === artist && S.kinkNow.title === title) tag.textContent = String(v);
  });
}

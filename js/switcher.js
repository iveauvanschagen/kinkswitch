// Alle wisselbeslissingen: reclame, Must skip, Must hear en terug naar KINK.
// tick() draait elke seconde en beslist wat er moet gebeuren.
import { S } from './state.js';
import { isBanned, isFav } from './artists.js';
import { MAX_AWAY, SKIP_EARS, SKIP_PUNS } from './config.js';
import { $, radio } from './dom.js';
import { metaDue, metaFresh } from './kink/meta.js';
import { startKink } from './kink/radio.js';
import { LOG } from './log.js';
import { aborted } from './spotify/api.js';
import { getToken, hasLogin } from './spotify/auth.js';
import { keepAwakeSpotify } from './spotify/keepawake.js';
import { ownsSpotify, playList } from './spotify/player.js';
import { handleSpError } from './spotify/reach.js';
import { ls } from './store.js';
import { renderAd } from './ui/banner.js';
import { msg } from './ui/status.js';
import { setMode } from './ui/tiles.js';
import { buzz, hhmm, pickOther } from './util.js';

// vangnet: nooit langer dan 10 minuten weg
// Wachttijd voordat de app KINK verlaat. Standaard 20 s.
export function delayMs() {
  const v = ls('ks_delay2');
  return Math.max(0, Math.min(60, v === null || v === '' ? 20 : Number(v) || 0)) * 1000;
}

export function setAway(v) {
  S.autoAway = v;
  ls('ks_autoAway', v ? String(v) : null);
  if (!v) setSkipInfo(null);
}

export function setSkipInfo(v) {
  S.skipInfo = v;
  ls('ks_skipInfo', v ? JSON.stringify(v) : null);
}

export function newSkipInfo(artist) {
  S.lastPun = pickOther(SKIP_PUNS, S.lastPun);
  S.lastEar = pickOther(SKIP_EARS, S.lastEar);
  return { pun: S.lastPun, ear: S.lastEar.replace('{band}', artist || 'deze band') };
}

export function setHandled(v) {
  S.handledBreak = v;
  ls('ks_handledBreak', String(v));
}

export async function autoToSpotify(breakStart) {
  setHandled(breakStart);
  LOG('switch', 'info', 'Reclame/nieuws op KINK: naar Spotify');
  if (!hasLogin()) return msg('Automatisch wisselen kan niet: Spotify is niet gekoppeld.', true);
  S.busy = true;
  try {
    await playList();
    setAway(Date.now());
    setSkipInfo(null);
    msg('Reclame of nieuws op KINK: even naar Spotify.');
    buzz();
  } catch (e) {
    if (!aborted(e)) {
      msg('Automatisch wisselen mislukt: ' + e.message, true);
      buzz();
      handleSpError(e, { kind: 'break' });
    }
  }
  S.busy = false;
}

export async function autoToKink(why) {
  LOG('switch', 'info', 'Terug naar KINK: ' + why);
  setAway(0);
  if (S.mode !== 'spotify') return;
  S.busy = true;
  // Speelt Spotify ergens anders (ander apparaat of andere kopie van de app)? Dan niets doen.
  if (!(await ownsSpotify())) {
    LOG('switch', 'warn', 'Spotify speelt elders, deze kopie doet niets');
    setMode('kink');
    S.busy = false;
    return;
  }
  const ok = await startKink(true);
  if (ok) msg(why);
  else {
    msg('Weer muziek op KINK. Tik op KINK.', true);
    buzz();
  }
  S.busy = false;
}

export function tick() {
  const now = Date.now();
  metaDue();
  // Sleutel op tijd vernieuwen, vijf minuten voor hij verloopt
  if (
    hasLogin() &&
    !S.authBroken &&
    !S.refreshing &&
    S.tokenExpiry &&
    S.tokenExpiry - now < 5 * 60000 &&
    now - S.lastRefreshTry > 15000
  ) {
    S.lastRefreshTry = now;
    getToken().catch(() => {});
  }
  $('clock').textContent = hhmm(now);
  if (!S.busy) {
    const fresh = metaFresh(now),
      d = delayMs();
    if (S.autoAway) {
      if (S.mode !== 'spotify') setAway(0);
      else if (fresh && !S.kinkNow.isBreak && S.kinkNow.title && !isBanned(S.kinkNow.artist))
        autoToKink(
          'Weer muziek op KINK: ' + (S.kinkNow.artist ? S.kinkNow.artist + ' - ' : '') + S.kinkNow.title
        );
      else if (now - S.autoAway > MAX_AWAY) autoToKink('Terug naar KINK (na 10 minuten)');
    } else if (
      S.auto &&
      S.mode === 'kink' &&
      !radio.paused &&
      fresh &&
      S.kinkNow.isBreak &&
      S.kinkNow.breakStart !== S.handledBreak &&
      now >= S.kinkNow.breakStart + d &&
      now - S.kinkNow.breakStart < 5 * 60000
    ) {
      autoToSpotify(S.kinkNow.breakStart);
    } else if (
      S.mode === 'kink' &&
      !radio.paused &&
      fresh &&
      !S.kinkNow.isBreak &&
      S.kinkNow.title &&
      isBanned(S.kinkNow.artist) &&
      S.banHandled !== S.kinkNow.artist + S.kinkNow.title &&
      now >= S.kinkNow.start + d
    ) {
      banToSpotify(S.kinkNow.artist + S.kinkNow.title, S.kinkNow.artist);
    }
  }
  renderAd(now);
  keepAwakeSpotify();
}

export async function banToSpotify(key, artist) {
  S.banHandled = key;
  LOG('switch', 'info', 'Must skip op KINK (' + artist + '): naar Spotify');
  if (!hasLogin()) return;
  S.busy = true;
  try {
    await playList();
    setAway(Date.now());
    setSkipInfo(newSkipInfo(artist));
    msg(artist + ' op KINK: even naar Spotify.');
  } catch (e) {
    if (!aborted(e)) {
      msg('Wisselen mislukt: ' + e.message, true);
      handleSpError(e, { kind: 'ban', key });
    }
  }
  S.busy = false;
}

export function checkFav(artist, key) {
  const tile = $('kinkMode');
  tile.classList.remove('fav');
  if (!artist || !isFav(artist)) return;
  tile.classList.add('fav');
  buzz();
  // Op Spotify en jouw muziek op KINK: terug naar KINK (één keer per nummer)
  if (S.mode === 'spotify' && S.switchedFor !== key) {
    S.switchedFor = key;
    ownsSpotify().then(own => {
      if (!own) {
        setMode('kink');
        return;
      }
      setAway(0);
      startKink(true).then(ok => {
        if (ok) msg('Jouw muziek op KINK: ' + artist + ' - ' + S.kinkNow.title);
      });
    });
  } else msg('Jouw muziek op KINK: ' + artist + ' - ' + S.kinkNow.title);
}

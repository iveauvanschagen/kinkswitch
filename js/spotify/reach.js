// Is Spotify bereikbaar? Waarschuwing in de Spotify-tegel, en een gemiste wissel alsnog doen.
import { S } from '../state.js';
import { IS_PHONE } from '../config.js';
import { $ } from '../dom.js';
import { metaFresh } from '../kink/meta.js';
import { LOG } from '../log.js';
import { silly } from '../silly.js';
import { connect, getToken, hasLogin } from './auth.js';
import { goSpotify, pickDevice, playlistUri, readQueued, spDevices } from './player.js';
import { ls } from '../store.js';
import { autoToSpotify, banToSpotify } from '../switcher.js';
import { msg } from '../ui/status.js';
import { spotTip } from '../ui/tour.js';
import { blinkSpotify, renderSpIssue, renderSpotIdle, setMode } from '../ui/tiles.js';

export function setSpIssue(kind) {
  if (kind !== S.spIssue) LOG('spotify', 'err', 'Waarschuwing: ' + kind);
  if (kind !== S.spIssue)
    msg(
      kind === 'login'
        ? 'Koppeling met Spotify verlopen. Tik op de Spotify-tegel om opnieuw te koppelen.'
        : 'Spotify staat niet aan. Tik op de Spotify-tegel om hem te openen.',
      true
    );
  S.spIssue = kind;
  S.spReady = '';
  renderSpotIdle();
  if (kind === 'nodevice' && hasLogin()) spotTip();
}

export function clearSpIssue(found) {
  if (!S.spIssue) return;
  S.spIssue = '';
  S.spWatchUntil = 0;
  $('spotifyMode').classList.remove('issue');
  LOG('spotify', 'ok', 'Waarschuwing opgeheven');
  setMode(S.mode);
  if (found) msg('Spotify gevonden. De app kan weer wisselen.');
}

// Is Spotify bereikbaar? Groen als hij klaarstaat, rood als hij er niet is. KINK speelt gewoon door.
// Stil: bij het starten, bij terugkomen in de app en tijdens het wachten na een tik op rood.
export async function checkSpotify() {
  if (S.spChecking || !hasLogin()) return;
  S.spChecking = true;
  try {
    try {
      await getToken();
    } catch (e) {
      if (S.authBroken) setSpIssue('login');
      return;
    }
    const wasIssue = S.spIssue === 'nodevice';
    const list = await spDevices();
    if (list.length) {
      const dev = pickDevice(list);
      S.spReady = dev ? dev.name : '';
      if (S.spIssue === 'nodevice') clearSpIssue(false);
      LOG('spotify', 'ok', 'Spotify staat klaar op ' + S.spReady);
      if (wasIssue) msg('Spotify staat klaar op ' + S.spReady);
      if (S.pendingSwitch) retryPending();
      else if (S.mode !== 'spotify') await readQueued();
    } else {
      S.spReady = '';
      // Spotify geeft soms een lege lijst terwijl hij via ons speelt. Dan geen waarschuwing.
      if (S.mode === 'spotify' && S.iStarted) {
        LOG('spotify', 'warn', 'Spotify meldt geen apparaten, maar speelt via deze app: geen waarschuwing');
        return;
      }
      setSpIssue('nodevice');
    }
  } catch (e) {
  } finally {
    S.spChecking = false;
    renderSpotIdle();
  }
}

export async function retryPending() {
  const p = S.pendingSwitch;
  S.pendingSwitch = null;
  if (!p || Date.now() - p.at > 5 * 60000 || S.busy) return;
  const now = Date.now(),
    fresh = metaFresh(now);
  if (p.kind === 'tap') {
    LOG('switch', 'info', 'Spotify is terug: wissel alsnog');
    return goSpotify();
  }
  if (p.kind === 'silly') {
    LOG('switch', 'info', "Spotify is terug: Don't be silly alsnog");
    return silly();
  }
  if (p.kind === 'break' && fresh && S.kinkNow.isBreak) {
    LOG('switch', 'info', 'Spotify is terug, nog steeds reclame: naar Spotify');
    return autoToSpotify(S.kinkNow.breakStart);
  }
  if (p.kind === 'ban' && fresh && S.kinkNow.artist + S.kinkNow.title === p.key) {
    LOG('switch', 'info', 'Spotify is terug, Must skip speelt nog: naar Spotify');
    return banToSpotify(p.key, S.kinkNow.artist);
  }
  LOG('switch', 'info', 'Spotify is terug, reden voor de wissel is voorbij: KINK blijft');
  msg('Spotify is er weer. KINK speelt gewoon door.');
}

// Na een tik: 60 seconden lang elke 3 seconden kijken of Spotify er al is
export function watchSpotify() {
  S.spWatchUntil = Date.now() + 60000;
  renderSpIssue();
  const loop = async () => {
    if (!S.spWatchUntil || !S.spIssue) return;
    if (Date.now() > S.spWatchUntil) {
      S.spWatchUntil = 0;
      renderSpIssue();
      msg('Spotify nog niet gevonden. Tik nog een keer op de Spotify-tegel.', true);
      return;
    }
    await checkSpotify();
    if (S.spWatchUntil) setTimeout(loop, 3000);
  };
  setTimeout(loop, 2500);
}

export function handleSpError(e, retry) {
  const m = String((e && e.message) || e);
  if (/Geen Spotify-apparaat|niet af/.test(m)) {
    setSpIssue('nodevice');
    blinkSpotify();
    if (retry) S.pendingSwitch = { ...retry, at: Date.now() };
  } else if (S.authBroken || /verlopen|Koppel eerst/.test(m)) {
    setSpIssue('login');
    blinkSpotify();
  }
}

export function fixSpotify() {
  if (S.spIssue === 'login') {
    $('clientId').value = ls('ks_client') || '';
    connect();
    return;
  }
  watchSpotify();
  // Opent je playlist in de Spotify-app. Daarmee meldt Spotify zich weer aan en kan de app hem besturen.
  const uri = playlistUri(),
    path = uri ? uri.split(':').slice(1).join('/') : '',
    web = 'https://open.spotify.com/' + path;
  LOG('spotify', 'info', 'Spotify openen' + (path ? ' met je playlist' : ''));
  if (IS_PHONE && /Android/i.test(navigator.userAgent))
    location.href =
      'intent://open.spotify.com/' +
      path +
      '#Intent;scheme=https;package=com.spotify.music;S.browser_fallback_url=' +
      encodeURIComponent(web) +
      ';end';
  else if (IS_PHONE) location.href = uri || 'spotify:';
  else window.open(web, '_blank');
}

// De KINK-livestream starten.
import { S } from '../state.js';
import { radio } from '../dom.js';
import { metaFresh } from './meta.js';
import { LOG } from '../log.js';
import { api } from '../spotify/api.js';
import { hasLogin } from '../spotify/auth.js';
import { spActive } from '../spotify/keepawake.js';
import { playlistUri } from '../spotify/player.js';
import { autoToSpotify, setAway, setHandled } from '../switcher.js';
import { msg } from '../ui/status.js';
import { setMode, setPP } from '../ui/tiles.js';

// Geeft true terug als KINK echt speelt
export async function startKink(fromAuto) {
  S.iStarted = false;
  LOG('switch', 'info', 'KINK starten' + (fromAuto ? ' (automatisch)' : ''));
  if (!fromAuto) {
    setAway(0);
    S.pendingSwitch = null;
    S.kinkSeq++;
    // Zelf KINK gekozen tijdens een blok: dit blok niet meer automatisch overslaan
    if (S.kinkNow?.isBreak) setHandled(S.kinkNow.breakStart);
    if (S.kinkNow?.title) S.banHandled = S.kinkNow.artist + S.kinkNow.title;
  }
  if (hasLogin()) {
    try {
      await api('/me/player/pause', 'PUT', undefined, false, true);
      spActive();
    } catch (e) {}
  }
  try {
    radio.load(); // altijd vers inhaken op de livestream, niet op een oude buffer
    LOG('kink', 'info', 'Stream laden');
    await radio.play();
    setMode('kink');
    setPP(true);
    msg(fromAuto ? 'Automatisch terug naar KINK' : 'KINK speelt live');
    return true;
  } catch (e) {
    LOG('kink', 'err', 'Stream start niet: ' + e.message);
    msg('KINK start niet. Tik nog een keer op KINK.', true);
    return false;
  }
}

export async function kinkTap() {
  const first = S.firstKinkTap;
  S.firstKinkTap = false;
  const now = Date.now();
  if (
    first &&
    S.auto &&
    hasLogin() &&
    playlistUri() &&
    !S.busy &&
    metaFresh(now) &&
    S.kinkNow.isBreak &&
    now - S.kinkNow.breakStart < 5 * 60000
  ) {
    LOG('switch', 'info', 'KINK gekozen tijdens reclame/nieuws: meteen naar Spotify');
    await autoToSpotify(S.kinkNow.breakStart);
    // Lukte het niet, dan toch KINK, zoals gevraagd
    if (S.mode !== 'spotify' && radio.paused) {
      radio.load();
      radio.play().catch(() => {});
    }
    return;
  }
  return startKink();
}

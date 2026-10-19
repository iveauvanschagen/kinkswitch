// Spotify wakker houden. Een gepauzeerde Spotify meldt zich na ongeveer 10 minuten af
// (gemeten in het lab: 11 minuten). Daarom laat de app hem elke 9 minuten zo kort mogelijk spelen.
import { S } from '../state.js';
import { IS_PHONE, KEEP_EVERY } from '../config.js';
import { radio } from '../dom.js';
import { LOG } from '../log.js';
import { api } from './api.js';
import { hasLogin } from './auth.js';
import { noteQueued, pickDevice, spDevices } from './player.js';
import { handleSpError, setSpIssue } from './reach.js';
import { ls } from '../store.js';
import { msg } from '../ui/status.js';
import { renderSpotIdle } from '../ui/tiles.js';
import { hhmm, sleep } from '../util.js';

export function keepOn() {
  const v = ls('ks_keep');
  return v === null ? IS_PHONE : v === '1';
}

export function spActive() {
  S.lastSpActive = Date.now();
}

// test: via de diagnose, los van timer en instelling. Elke run komt stap voor stap in de log (WAKKER).
export async function keepAwakeSpotify(test) {
  if (S.keepBusy || S.busy || !hasLogin() || S.authBroken) return;
  if (!test) {
    if (!keepOn() || S.mode !== 'kink' || radio.paused || S.spIssue) return;
    if (Date.now() - S.lastSpActive < KEEP_EVERY) return;
  }
  const how = test ? 'Test' : 'Automatisch';
  S.keepBusy = true;
  S.busy = true;
  S.lastSpActive = Date.now();
  LOG(
    'keep',
    'info',
    how + ': start' + (test ? '' : ', Spotify was ' + Math.round(KEEP_EVERY / 60000) + ' minuten niet actief')
  );
  try {
    const list = await spDevices();
    if (!list.length) {
      LOG('keep', 'err', how + ': Spotify slaapt al, geen apparaten');
      setSpIssue('nodevice');
      return;
    }
    const dev = pickDevice(list),
      kind = IS_PHONE ? ['Smartphone', 'Tablet'] : ['Computer'];
    // Nooit op een ander soort apparaat spelen (bijvoorbeeld je laptop terwijl je in de auto zit)
    if (!ls('ks_device') && !kind.includes(dev.type)) {
      LOG('keep', 'err', how + ': Spotify op dit apparaat slaapt al (alleen ' + dev.name + ' gevonden)');
      setSpIssue('nodevice');
      return;
    }
    let p = null;
    try {
      p = await api('/me/player');
    } catch (e) {}
    noteQueued(p);
    if (p && p.is_playing) {
      LOG('keep', 'info', how + ': niet nodig, Spotify speelt al op ' + (p.device?.name || '?'));
      return;
    }
    const kinkWas = S.mode === 'kink' && !radio.paused;
    const t0 = Date.now();
    S.keepPausing = true;
    LOG('keep', 'info', how + ': ' + dev.name + ' kort laten spelen');
    await api('/me/player/play?device_id=' + encodeURIComponent(dev.id), 'PUT');
    // Pauzeren zodra Spotify meldt dat hij speelt (maximaal 3 seconden)
    let ok = false;
    while (Date.now() - t0 < 3000) {
      try {
        const q = await api('/me/player');
        if (q && q.is_playing) {
          ok = true;
          break;
        }
      } catch (e) {}
      await sleep(120);
    }
    LOG(
      'keep',
      ok ? 'info' : 'warn',
      how +
        ': ' +
        (ok
          ? 'Spotify speelt na ' + (Date.now() - t0) + ' ms, nu pauzeren'
          : 'Spotify meldde binnen 3 s niet dat hij speelde, toch pauzeren')
    );
    try {
      await api('/me/player/pause?device_id=' + encodeURIComponent(dev.id), 'PUT', undefined, false, true);
    } catch (e) {}
    const played = Date.now() - t0;
    await sleep(400);
    let back = 'KINK speelde niet';
    if (kinkWas) {
      if (radio.paused) {
        const t1 = Date.now();
        try {
          radio.load();
          await radio.play();
          back = 'KINK was even stil, weer aan na ' + (Date.now() - t1) + ' ms';
        } catch (e) {
          back = 'KINK start niet weer';
        }
      } else back = 'KINK bleef spelen';
    }
    LOG(
      'keep',
      ok ? 'ok' : 'warn',
      how +
        ': klaar, ' +
        dev.name +
        ' wakker gehouden (' +
        (played / 1000).toFixed(1).replace('.', ',') +
        ' s gespeeld, ' +
        back +
        '). Volgende keer rond ' +
        hhmm(Date.now() + KEEP_EVERY)
    );
    S.spReady = dev.name;
    S.lastKeepRun = Date.now();
    renderSpotIdle();
    if (test)
      msg('Wakker houden getest: ' + (ok ? 'gelukt' : 'Spotify meldde geen afspelen') + ', zie log', !ok);
  } catch (e) {
    LOG('keep', 'err', how + ': mislukt, ' + e.message);
    handleSpError(e);
  } finally {
    S.keepPausing = false;
    S.keepBusy = false;
    S.busy = false;
  }
}

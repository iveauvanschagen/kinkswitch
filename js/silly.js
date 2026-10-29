// Don't be silly: de single van Wodan Boys als album afspelen en controleren.
import { S } from './state.js';
import { SILLY_ALBUM } from './config.js';
import { radio } from './dom.js';
import { LOG } from './log.js';
import { api } from './spotify/api.js';
import { hasLogin } from './spotify/auth.js';
import { spActive } from './spotify/keepawake.js';
import { deviceId, wakeDevice } from './spotify/player.js';
import { clearSpIssue, handleSpError } from './spotify/reach.js';
import { setAway } from './switcher.js';
import { settings } from './ui/settings.js';
import { msg } from './ui/status.js';
import { say } from './texts.js';
import { fadeReset } from './kink/fade.js';
import { wantKink } from './kink/watch.js';
import { setMode, setPP } from './ui/tiles.js';
import { buzz, sleep } from './util.js';

export async function silly() {
  if (S.sillyBusy) return;
  LOG('switch', 'info', "Don't be silly ingedrukt");
  if (!hasLogin()) return settings('Sp');
  msg(say('sillyStart'));
  const wasKink = S.mode === 'kink' && !radio.paused;
  S.sillyBusy = true;
  try {
    const dev = await deviceId();
    wantKink(false);
    radio.pause();
    setAway(0);
    await wakeDevice(dev);
    const play = () =>
      api('/me/player/play?device_id=' + encodeURIComponent(dev), 'PUT', {
        context_uri: SILLY_ALBUM,
        offset: { position: 0 },
        position_ms: 0,
      });
    const check = async label => {
      await sleep(1600);
      let p = null;
      try {
        p = await api('/me/player');
      } catch (e) {}
      LOG(
        'switch',
        'info',
        label +
          ': ' +
          (p
            ? (p.is_playing ? 'speelt' : 'staat stil') +
              ': ' +
              (p.item?.name || 'geen nummer geladen') +
              (p.context?.uri ? ' (context ' + p.context.uri + ')' : '') +
              ' op ' +
              (p.device?.name || '?')
            : 'geen speler actief')
      );
      return !!(
        p &&
        p.is_playing &&
        p.item &&
        (p.context?.uri === SILLY_ALBUM || /silly/i.test(p.item.name || ''))
      );
    };
    await play();
    setMode('spotify');
    setPP(true);
    S.iStarted = true;
    spActive();
    let ok = await check('Na afspelen');
    if (!ok) {
      LOG('switch', 'warn', 'Nog niet aan het spelen, tweede poging met apparaat geactiveerd');
      try {
        await api('/me/player', 'PUT', { device_ids: [dev], play: false });
        await sleep(700);
      } catch (e) {}
      await play();
      ok = await check('Na tweede poging');
    }
    if (!ok) throw Error("Spotify speelde Don't be silly niet af. Open de Spotify-app (zie Diagnose).");
    clearSpIssue(false);
    msg(say('sillyDone'));
    buzz();
  } catch (e) {
    LOG('switch', 'err', e.message);
    msg(e.message, true);
    // Nooit stilte: speelde KINK, dan gaat KINK gewoon door
    if (wasKink || S.mode === 'spotify') {
      S.iStarted = false;
      fadeReset();
      radio.load();
      radio
        .play()
        .then(() => {
          wantKink(true);
          setMode('kink');
          setPP(true);
        })
        .catch(() => {});
    }
    handleSpError(e, { kind: 'silly' });
  } finally {
    S.sillyBusy = false;
  }
}

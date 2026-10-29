// Bewaker voor de KINK-stream: valt de stream onverwacht weg (internet even weg, stream hapert),
// dan opnieuw verbinden. Na 2, 5, 10 en daarna elke 20 seconden, maximaal 6 keer.
// Alleen als KINK hoort te spelen: niet na zelf pauzeren, niet als de app naar Spotify is gewisseld.
// Een pauze door een andere app (bijvoorbeeld Spotify zelf) is geen storing: dan doet de bewaker niets.
import { S } from '../state.js';
import { radio } from '../dom.js';
import { LOG } from '../log.js';
import { applyChannel } from './channel.js';

const WAITS = [2000, 5000, 10000, 20000, 20000, 20000];
let tries = 0;
let timer = null;
let lastTime = -1;
let stuckSince = 0;

export function wantKink(v) {
  S.kinkWanted = v;
  if (!v) {
    clearTimeout(timer);
    timer = null;
    tries = 0;
    stuckSince = 0;
  }
}

function shouldPlay() {
  return S.kinkWanted && S.mode === 'kink' && !S.keepBusy && !S.busy;
}

function reconnect(why) {
  if (timer || !shouldPlay()) return;
  if (tries >= WAITS.length) {
    if (tries === WAITS.length) LOG('kink', 'err', 'KINK opnieuw verbinden lukt niet, gestopt. Tik op KINK.');
    tries++;
    return;
  }
  const wait = WAITS[tries++];
  LOG('kink', 'warn', 'KINK haperde (' + why + '), opnieuw verbinden over ' + wait / 1000 + ' s');
  timer = setTimeout(async () => {
    timer = null;
    if (!shouldPlay()) return;
    try {
      applyChannel();
      radio.load();
      await radio.play();
      LOG('kink', 'ok', 'KINK opnieuw verbonden');
      tries = 0;
      stuckSince = 0;
    } catch (e) {
      LOG('kink', 'warn', 'Opnieuw verbinden lukt niet: ' + e.message);
      reconnect('nog steeds geen geluid');
    }
  }, wait);
}

// Elke seconde vanuit de klok: speelt de stream nog echt (loopt de tijd door)?
export function watchKink() {
  if (!shouldPlay() || radio.paused) {
    lastTime = -1;
    stuckSince = 0;
    return;
  }
  const t = radio.currentTime;
  if (t !== lastTime) {
    lastTime = t;
    stuckSince = 0;
    if (tries && !timer) tries = 0;
    return;
  }
  if (!stuckSince) stuckSince = Date.now();
  else if (Date.now() - stuckSince > 10000) {
    stuckSince = Date.now();
    reconnect('stream staat stil');
  }
}

export function bindWatch() {
  radio.addEventListener('error', () => reconnect('fout in de stream'));
  radio.addEventListener('ended', () => reconnect('stream gestopt'));
}

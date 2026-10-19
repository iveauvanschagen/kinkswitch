// Opstarten: knoppen koppelen, eerste toestand tonen en de klok starten.
import { S } from './state.js';
import { APP_VERSION, IS_PHONE, OLD_KEYS } from './config.js';
import { LOG, watchErrors } from './log.js';
import { callback, hasLogin } from './spotify/auth.js';
import { pollSpotify } from './spotify/player.js';
import { checkSpotify } from './spotify/reach.js';
import { ls } from './store.js';
import { tick } from './switcher.js';
import { bindDiagnose } from './ui/diagnose.js';
import { bindPicker, incoming } from './ui/picker.js';
import { bindSettings } from './ui/settings.js';
import { msg } from './ui/status.js';
import { bindHome, renderAuto, renderSpotIdle, setMode, setPP } from './ui/tiles.js';
import { keepAwake } from './wakelock.js';

watchErrors();
bindHome();
bindPicker();
bindSettings();
bindDiagnose();

// Terug in de app: scherm aan, Spotify checken en meteen opnieuw beslissen
document.addEventListener('visibilitychange', () => {
  LOG('app', 'info', 'Zichtbaarheid: ' + document.visibilityState);
  if (document.visibilityState === 'visible') {
    keepAwake();
    checkSpotify();
    tick();
  }
});

// Opruimen: sleutels van functies die niet meer bestaan
for (const k of OLD_KEYS) if (ls(k) !== null) ls(k, null);

// Eerste toestand tonen
renderAuto();
setPP(false);
setMode('kink');
msg(hasLogin() ? 'Spotify gekoppeld' : 'Spotify niet gekoppeld. Tik op het tandwiel.');
const installed = matchMedia('(display-mode: standalone)').matches;
LOG(
  'app',
  'info',
  `Gestart ${APP_VERSION}, ${IS_PHONE ? 'telefoon' : 'computer'}, ${installed ? 'geïnstalleerde app' : 'browser'}`
);

// Terug van het koppelen met Spotify, of een gedeelde playlist of koppellink
callback();
incoming();

tick();
setTimeout(() => checkSpotify(), 2000);
keepAwake();
renderSpotIdle();
setInterval(pollSpotify, 10000);
startClock();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Klok: een Web Worker geeft elke seconde een seintje. Browsers remmen gewone timers in een
// verborgen tabblad sterk af, die van een Worker veel minder. Zonder Worker valt hij terug op setInterval.
function startClock() {
  try {
    const src = 'setInterval(()=>postMessage(0),1000)';
    const worker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    worker.onmessage = () => tick();
  } catch (e) {
    setInterval(tick, 1000);
  }
}

// Testhaak, alleen op je eigen computer (localhost): de testscripts kunnen zo de toestand lezen
// en functies aanroepen. Op GitHub Pages gebeurt hier niets.
if (['127.0.0.1', 'localhost'].includes(location.hostname)) {
  const files = [
    'config',
    'store',
    'dom',
    'util',
    'log',
    'artists',
    'catch',
    'silly',
    'switcher',
    'wakelock',
    'kink/meta',
    'kink/radio',
    'spotify/auth',
    'spotify/api',
    'spotify/player',
    'spotify/keepawake',
    'spotify/reach',
    'ui/status',
    'ui/tiles',
    'ui/banner',
    'ui/settings',
    'ui/picker',
    'ui/diagnose',
  ];
  for (const f of files) Object.assign(window, await import('./' + f + '.js'));
  for (const k of Object.keys(S)) {
    Object.defineProperty(window, k, { get: () => S[k], set: v => (S[k] = v), configurable: true });
  }
  window.S = S;
}

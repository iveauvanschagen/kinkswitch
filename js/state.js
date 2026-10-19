// Alle toestand die tijdens het draaien verandert, op één plek.
// Modules lezen en schrijven via S, zodat iedereen dezelfde waarde ziet.
import { ls } from './store.js';

export const S = {
  // Wat speelt er: 'kink' of 'spotify'
  mode: 'kink',
  // Er loopt een wissel; tick() wacht dan even
  busy: false,
  // Scherm aan houden
  wakeLock: null,

  // Spotify-sleutel. De vernieuwingssleutel is maar één keer bruikbaar, dus er vernieuwt er maar één tegelijk.
  token: null,
  tokenExpiry: 0,
  refreshing: null,
  authBroken: false,
  lastRefreshTry: 0,

  // Diagnose-log
  logBuf: [],
  logTimer: null,
  lastErr: null,
  dbgFilter: 'all',

  // Automatisch wisselen
  auto: ls('ks_auto') !== '0',
  // Moment waarop we wegens reclame of Must skip naar Spotify gingen (0 = niet weg)
  autoAway: Number(ls('ks_autoAway')) || 0,
  // Starttijd van het reclameblok dat al is afgehandeld, zodat we niet twee keer wisselen
  handledBreak: Number(ls('ks_handledBreak')) || 0,
  // Must skip: het nummer dat al is overgeslagen, en de grap in de banner
  banHandled: '',
  skipInfo: null,
  lastPun: '',
  lastEar: '',
  // Must hear: voor welk nummer we al terug zijn gegaan
  lastFavKey: '',
  switchedFor: '',
  // Eerste keer KINK na het openen van de app: loopt er reclame of nieuws, dan meteen naar Spotify
  firstKinkTap: true,
  // Telt hoe vaak je zelf KINK kiest, zodat een lopende Spotify-controle weet dat hij moet stoppen
  kinkSeq: 0,

  // KINK-gegevens
  kinkNow: null,
  metaFails: 0,
  nextMetaAt: 0,
  metaBusy: false,
  talkLogged: 0,
  lastKinkData: '',
  lastKinkSong: '',

  // Spotify-apparaten en afspelen
  lastDevList: [],
  // Deze kopie van de app heeft Spotify zelf gestart (en is daarna niet terug naar KINK gegaan)
  iStarted: false,
  goBusy: false,
  sillyBusy: false,
  spotNow: null,
  // Het nummer uit je gekozen playlist dat in Spotify klaarstaat (null = niets of iets anders)
  spQueued: null,
  // Na een nieuwe start: de playlist die Spotify moet melden voordat we een nummer tonen
  spExpect: null,
  lastSpotKey: '',

  // Is Spotify bereikbaar?
  spIssue: '',
  spReady: '',
  spWatchUntil: 0,
  spChecking: false,
  // Wissel die mislukte omdat Spotify sliep. Komt Spotify terug, dan doet de app hem alsnog.
  pendingSwitch: null,

  // Spotify wakker houden
  lastSpActive: Date.now(),
  keepBusy: false,
  keepPausing: false,
  lastKeepRun: 0,

  // KINK Catch en Gemist op KINK
  missItems: [],

  // Kleine timers voor meldingen
  savedTimer: null,
  toastTimer: null,
};

try {
  S.logBuf = JSON.parse(localStorage.getItem('ks_log') || '[]');
} catch (e) {
  S.logBuf = [];
}
try {
  S.skipInfo = JSON.parse(ls('ks_skipInfo') || 'null');
} catch (e) {}

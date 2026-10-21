// Vaste waarden en instellingen van de app op één plek.

// Versie: staat in de diagnose en het log. Bij elke release omhoog, samen met CACHE in sw.js.
export const APP_VERSION = 'v1.3.0';

// Draait de app op een telefoon (aanraakscherm) of op een computer?
export const IS_PHONE = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches);

/* ---------- Spotify ---------- */

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-private',
  'playlist-modify-public',
].join(' ');

// Canonieke redirect: altijd de map-URL, zonder index.html, query of hash
export const REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');

// Een gepauzeerde Spotify meldt zich na ongeveer 10 minuten af (gemeten in het lab: 11 minuten).
// Daarom laat de app hem elke 9 minuten zo kort mogelijk spelen. Volume 0 lukt op de meeste telefoons niet.
// Standaard aan op telefoons, uit op computers (daar slaapt Spotify niet zo snel).
export const KEEP_EVERY = 9 * 60000;

// Don't be silly: de single van Wodan Boys (album met één nummer). Starten als context,
// net als een playlist; dat werkt betrouwbaar.
export const SILLY_ALBUM = 'spotify:album:0V64voJRjQ3zboCinONl2c';

export const CATCH_NAME = 'KINK Catch';

/* ---------- KINK ---------- */

// Now playing van KINK bij Triton (StreamTheWorld)
export const KINK_META_URL = 'https://np.tritondigital.com/public/nowplaying?mountName=KINK';

// Een item zonder titel van zo lang of langer is nieuws of reclame (korter: jingle of presentator)
export const BREAK_MIN_MS = 45000;

// KINK zendt reclame en nieuws alleen uit rond het hele en halve uur: zoveel minuten ervoor tot erna
export const AD_WINDOW_MIN = 6;

// Vangnet: nooit langer dan 10 minuten weg van KINK
export const MAX_AWAY = 10 * 60000;

/* ---------- Artiesten ---------- */

export const SUGGESTIONS = [
  'Foo Fighters',
  'Turnstile',
  'Rage Against The Machine',
  'System of a Down',
  'Muse',
];

export const BAN_SUGGESTIONS = ['The Killers'];

// Must skip: de banner maakt er een grapje van in plaats van "Reclame overgeslagen"
export const SKIP_PUNS = [
  'Deze slaan we over',
  'Skip skip hooray',
  'Born Skippy',
  'Skip happens',
  'Skipperdeflip',
];

export const SKIP_EARS = [
  'Oren beveiligd tegen {band}',
  'Je oren zijn je dankbaar',
  'Geen bloedende oren vandaag',
];

/* ---------- Opslag ---------- */

// Sleutels van functies die niet meer bestaan; worden bij het starten opgeruimd
export const OLD_KEYS = [
  'ks_delay',
  'ks_gcache',
  'ks_genreSwitch',
  'ks_genres',
  'ks_useGenre',
  'ks_sillyUri',
  'ks_sillyName',
  'ks_techmsg',
];

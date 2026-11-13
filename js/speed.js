// Snelheid in de banner, zoals in Google Maps. Gebruikt de GPS van de telefoon.
// Alleen zolang de app in beeld is: een web app krijgt op de achtergrond geen locatie.
import { S } from './state.js';
import { $ } from './dom.js';
import { LOG } from './log.js';
import { ls } from './store.js';
import { msg, setSw, toast } from './ui/status.js';
import { keepAwake } from './wakelock.js';

// Zo lang zonder meting en we tonen "--" in plaats van een oud getal
const STALE_MS = 5000;
// De telefoon meldt "locatie niet beschikbaar" en er komt zo lang niets binnen: locatie staat uit
const UNAVAILABLE_MS = 15000;
// Helemaal niets meer binnen (ook geen foutmelding): zo lang duurt bijna geen tunnel
const SILENT_MS = 120000;

let watchId = null;
let timer = null;
let last = null;
let lastFixAt = 0;
let startedAt = 0;
let unavailableSince = 0;
let lastErrCode = 0;
let checking = false;

export function speedOn() {
  return ls('ks_speed') === '1';
}

// Aan of uit vanuit de instellingen. Aanzetten vraagt zo nodig om toegang tot je locatie.
export function setSpeed(on) {
  ls('ks_speed', on ? '1' : '0');
  if (on) {
    keepAwake();
    startSpeed();
  } else stopSpeed();
  LOG('app', 'info', 'Snelheid ' + (on ? 'aan' : 'uit'));
}

export function startSpeed() {
  if (!speedOn() || watchId !== null || document.visibilityState !== 'visible') return show();
  if (!('geolocation' in navigator)) return autoOff('Deze browser heeft geen GPS');
  last = null;
  lastFixAt = 0;
  unavailableSince = 0;
  lastErrCode = 0;
  startedAt = Date.now();
  watchId = navigator.geolocation.watchPosition(onFix, onErr, {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 15000,
  });
  clearInterval(timer);
  timer = setInterval(render, 1000);
  show();
  render();
}

export function stopSpeed() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
  clearInterval(timer);
  timer = null;
  show();
}

function show() {
  const on = speedOn();
  $('speed').hidden = !on;
  $('banner').classList.toggle('has-speed', on);
}

function onFix(p) {
  const c = p.coords;
  const t = p.timestamp || Date.now();
  // De telefoon geeft meestal zelf de snelheid door. Zo niet, dan rekenen we hem uit tussen twee metingen.
  let kmh = c.speed != null && c.speed >= 0 ? c.speed * 3.6 : null;
  if (kmh === null && last && c.accuracy <= 30 && last.acc <= 30) {
    const dt = (t - last.t) / 1000;
    if (dt > 0.5) kmh = (dist(last, c) / dt) * 3.6;
  }
  last = { t, lat: c.latitude, lon: c.longitude, acc: c.accuracy };
  if (!lastFixAt || Date.now() - lastFixAt > STALE_MS)
    LOG('app', 'info', 'GPS gevonden, nauwkeurigheid ' + Math.round(c.accuracy) + ' m');
  lastFixAt = Date.now();
  unavailableSince = 0;
  lastErrCode = 0;
  // Onwaarschijnlijke uitschieters (slechte meting bij het opstarten) laten we liggen
  if (kmh !== null && kmh < 250) S.speedKmh = kmh;
  render();
}

function onErr(e) {
  // 1 = geen toestemming. 2 = locatie niet beschikbaar. 3 = te lang geen meting.
  if (e.code !== lastErrCode) LOG('app', 'warn', `GPS-fout ${e.code}: ${e.message || 'geen omschrijving'}`);
  lastErrCode = e.code;
  if (e.code === 1) return autoOff('Geen toegang tot je locatie');
  if (e.code === 2 && !unavailableSince) unavailableSince = Date.now();
  render();
}

function render() {
  if (!speedOn()) return;
  const now = Date.now();
  const fresh = lastFixAt && now - lastFixAt < STALE_MS && S.speedKmh !== null;
  const v = fresh ? Math.round(S.speedKmh) : null;
  $('spdNum').textContent = v === null ? '--' : String(v);
  $('spdNum').classList.toggle('off', v === null);
  $('spdGps').classList.toggle('warn', !fresh);
  $('spdGpsTxt').textContent = fresh ? 'GPS' : 'Zoekt GPS';
  if (fresh) return;
  // Geen GPS: is locatie uitgezet? Elke 5 seconden kijken of de toestemming nog geldt.
  const quiet = now - Math.max(lastFixAt, startedAt);
  if (Math.floor(quiet / 1000) % 5 === 0) checkDenied();
  if (unavailableSince && now - unavailableSince > UNAVAILABLE_MS && now - lastFixAt > UNAVAILABLE_MS)
    return autoOff('Locatie staat uit op je telefoon');
  if (quiet > SILENT_MS) autoOff('Al 2 minuten geen GPS. Staat locatie uit');
}

async function checkDenied() {
  if (checking || !navigator.permissions) return;
  checking = true;
  try {
    const p = await navigator.permissions.query({ name: 'geolocation' });
    if (p.state === 'denied') autoOff('Geen toegang tot je locatie');
  } catch (e) {}
  checking = false;
}

// De app zet de snelheid zelf uit en vertelt waarom
function autoOff(reason) {
  if (!speedOn()) return;
  stopSpeed();
  ls('ks_speed', '0');
  S.speedKmh = null;
  show();
  setSw('swSpeed', false);
  LOG('app', 'warn', 'Snelheid automatisch uit: ' + reason);
  const end = reason.endsWith('uit') ? '?' : '.';
  toast('Snelheid uitgezet', reason + end + ' Zet hem weer aan via het tandwiel.');
  msg('Snelheid uitgezet: ' + reason.toLowerCase() + end);
}

// Afstand in meters tussen twee punten
function dist(a, c) {
  const R = 6371000;
  const r = x => (x * Math.PI) / 180;
  const dLa = r(c.latitude - a.lat);
  const dLo = r(c.longitude - a.lon);
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(c.latitude)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Direct nagaan of locatie nog aan staat. Bijvoorbeeld na het snelmenu van Android: daar zet je
// locatie uit, maar de app blijft gewoon in beeld en hoort er anders niets van.
let probing = false;
function probe(why) {
  if (!speedOn() || probing || !('geolocation' in navigator)) return;
  probing = true;
  LOG('app', 'info', 'GPS-check: ' + why);
  checkDenied();
  navigator.geolocation.getCurrentPosition(
    p => {
      probing = false;
      onFix(p);
    },
    e => {
      probing = false;
      LOG('app', 'warn', `GPS-check fout ${e.code}: ${e.message || 'geen omschrijving'}`);
      if (e.code === 1) autoOff('Geen toegang tot je locatie');
      else if (e.code === 2) autoOff('Locatie staat uit op je telefoon');
    },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
  );
}

// Weg uit beeld: GPS uit (scheelt batterij, de telefoon geeft dan toch niets). Terug: weer aan en checken.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    startSpeed();
    probe('app weer in beeld');
  } else stopSpeed();
});
// Terug uit het snelmenu of een melding: de app verloor even de focus
window.addEventListener('focus', () => probe('app weer actief'));

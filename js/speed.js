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
// Geen enkele meting en de telefoon meldt dat locatie niet beschikbaar is: dan staat locatie uit
const NO_FIX_MS = 20000;

let watchId = null;
let timer = null;
let last = null;
let lastFixAt = 0;
let startedAt = 0;
let hadFix = false;

export function speedOn() {
  return ls('ks_speed') === '1';
}

// Aan of uit vanuit de instellingen. Aanzetten vraagt zo nodig om toegang tot je locatie.
export function setSpeed(on) {
  ls('ks_speed', on ? '1' : '0');
  ls('ks_speedOff', null);
  renderNote();
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
  hadFix = false;
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
  lastFixAt = Date.now();
  if (!hadFix) LOG('app', 'info', 'GPS gevonden, nauwkeurigheid ' + Math.round(c.accuracy) + ' m');
  hadFix = true;
  // Onwaarschijnlijke uitschieters (slechte meting bij het opstarten) laten we liggen
  if (kmh !== null && kmh < 250) S.speedKmh = kmh;
  render();
}

function onErr(e) {
  // 1 = geen toestemming. 2 = locatie niet beschikbaar (staat uit, of nog geen signaal). 3 = te lang geen meting.
  if (e.code === 1) return autoOff('Geen toegang tot je locatie');
  if (e.code === 2 && !hadFix && Date.now() - startedAt > NO_FIX_MS) return autoOff('Locatie staat uit op je telefoon');
  render();
}

function render() {
  if (!speedOn()) return;
  const fresh = lastFixAt && Date.now() - lastFixAt < STALE_MS && S.speedKmh !== null;
  const v = fresh ? Math.round(S.speedKmh) : null;
  $('spdNum').textContent = v === null ? '--' : String(v);
  $('spdNum').classList.toggle('off', v === null);
  $('spdGps').classList.toggle('warn', !fresh);
  $('spdGpsTxt').textContent = fresh ? 'GPS' : 'Zoekt GPS';
  // Na een tijd zonder signaal: kijken of de telefoon locatie inmiddels helemaal heeft uitgezet
  if (!hadFix && Date.now() - startedAt > NO_FIX_MS) checkDenied();
}

let checking = false;
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
  stopSpeed();
  ls('ks_speed', '0');
  ls('ks_speedOff', JSON.stringify({ t: Date.now(), reason }));
  S.speedKmh = null;
  show();
  setSw('swSpeed', false);
  renderNote();
  LOG('app', 'warn', 'Snelheid automatisch uit: ' + reason);
  toast('Snelheid uitgezet', reason + '. Zet hem weer aan via het tandwiel.');
  msg('Snelheid uitgezet: ' + reason.toLowerCase() + '.');
}

// Uitleg in de instellingen als de app de snelheid zelf heeft uitgezet
export function renderNote() {
  const box = $('speedNote');
  let off = null;
  try {
    off = JSON.parse(ls('ks_speedOff') || 'null');
  } catch (e) {}
  box.hidden = !off || speedOn();
  if (!off) return;
  const time = new Date(off.t).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
  box.textContent = `Automatisch uitgezet om ${time}: ${off.reason.toLowerCase()}. Zet locatie aan op je telefoon en zet de schakelaar daarna weer aan.`;
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

// Weg uit beeld: GPS uit (scheelt batterij, de telefoon geeft dan toch niets). Terug: weer aan.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') startSpeed();
  else stopSpeed();
});

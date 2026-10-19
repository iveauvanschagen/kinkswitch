// Kleine hulpfuncties zonder afhankelijkheden: tijd, tekst en wachten.
export function fmt(s) {
  s = Math.max(0, Math.ceil(s));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export function hhmm(ms) {
  return new Date(ms).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
}

export function buzz() {
  if (navigator.vibrate) navigator.vibrate([250, 120, 250]);
}

export function pickOther(list, last) {
  const opts = list.filter(x => x !== last);
  return opts[Math.floor(Math.random() * opts.length)] || list[0];
}

export function hms(ts) {
  return new Date(ts).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function b64(a) {
  return btoa(String.fromCharCode(...new Uint8Array(a)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function rand(n = 64) {
  const a = new Uint8Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, x => ('0' + x.toString(16)).slice(-2)).join('');
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));

export function norm(x) {
  return (x || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function songKey(artist, title) {
  return norm(artist) + '|' + norm(title);
}

export function mainArtist(a) {
  return (a || '').split(/\s+(?:&|feat\.?|ft\.?|featuring|x|vs\.?)\s+|,/i)[0].trim();
}

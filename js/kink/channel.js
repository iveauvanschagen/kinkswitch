// Welke KINK-zender: gewone KINK, KINK DNA of KINK Distortion. Standaard gewone KINK.
import { radio } from '../dom.js';
import { ls } from '../store.js';

// info: false = KINK geeft voor deze zender geen nummers door. Dan geen nummerinfo en geen automatisch wisselen.
export const CHANNELS = {
  kink: { name: 'KINK', mount: 'KINK', info: true },
  dna: { name: 'KINK DNA', mount: 'KINK_DNA', info: true },
  distortion: { name: 'KINK Distortion', mount: 'KINK_DISTORTION', info: false },
};

export function channelKey() {
  const k = ls('ks_channel');
  return CHANNELS[k] ? k : 'kink';
}

export function channel() {
  return CHANNELS[channelKey()];
}

export function metaUrl() {
  return 'https://np.tritondigital.com/public/nowplaying?mountName=' + channel().mount;
}

export function streamUrl() {
  return 'https://playerservices.streamtheworld.com/api/livestream-redirect/' + channel().mount + '.mp3';
}

// Zet de juiste stream in de speler (bij het opstarten en na het wisselen van zender)
export function applyChannel() {
  const src = radio.querySelector('source');
  if (src && src.src !== streamUrl()) src.src = streamUrl();
  const n = document.getElementById('kinkName');
  if (n) n.textContent = channel().name;
}

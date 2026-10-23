// Zachte overgang: KINK even laten wegfaden of opkomen in plaats van hard afkappen.
import { radio } from '../dom.js';
import { ls } from '../store.js';

// Duur in seconden uit de instellingen (0 = uit). Standaard 1 seconde.
export function fadeSec() {
  const v = ls('ks_fade');
  return Math.max(0, Math.min(3, v === null || v === '' ? 1 : Number(v) || 0));
}

let run = 0;

function ramp(from, to, ms, id) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const step = () => {
      if (id !== run) return resolve(false);
      const k = Math.min(1, (performance.now() - t0) / ms);
      try {
        radio.volume = from + (to - from) * k;
      } catch (e) {}
      if (k < 1) setTimeout(step, 30);
      else resolve(true);
    };
    step();
  });
}

// Stopt een lopende fade en zet het volume weer vol (bijvoorbeeld als KINK opnieuw start)
export function fadeReset() {
  run++;
  try {
    radio.volume = 1;
  } catch (e) {}
}

// KINK wegfaden en daarna pauzeren
export async function fadeOutKink() {
  const ms = fadeSec() * 1000;
  const id = ++run;
  if (ms && !radio.paused && document.visibilityState === 'visible') await ramp(radio.volume, 0, ms, id);
  if (id !== run) return;
  radio.pause();
  try {
    radio.volume = 1;
  } catch (e) {}
}

// KINK laten opkomen (na radio.play)
export function fadeInKink() {
  const ms = fadeSec() * 1000;
  const id = ++run;
  if (!ms || document.visibilityState !== 'visible') {
    try {
      radio.volume = 1;
    } catch (e) {}
    return;
  }
  try {
    radio.volume = 0;
  } catch (e) {}
  ramp(0, 1, ms, id);
}

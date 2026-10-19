// Scherm aan houden (Wake Lock) zolang de app in beeld is.
import { S } from './state.js';
import { ls } from './store.js';

export async function keepAwake() {
  if (ls('ks_wake') !== '1' || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    S.wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {}
}

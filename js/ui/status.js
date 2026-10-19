// Statusregel onderin, korte meldingen en "Bewaard" in de instellingen.
import { S } from '../state.js';
import { $ } from '../dom.js';
import { LOG } from '../log.js';

export function msg(s, err) {
  let t = s;
  $('status').textContent = t;
  $('status').classList.toggle('err', !!err);
  // Staat dezelfde tekst net al in de log (als WISSEL, SPOTIFY enzovoort)? Dan niet nog een keer als MELDING.
  const last = S.logBuf[S.logBuf.length - 1];
  if (!(
    last &&
    last.c !== 'ui' &&
    Date.now() - last.t < 3000 &&
    (last.m === s || last.m.endsWith(s) || s.endsWith(last.m))
  ))
    LOG('ui', err ? 'err' : 'info', s);
}

export function setSw(id, on) {
  $(id).setAttribute('aria-checked', on ? 'true' : 'false');
}

export function saved(what) {
  const n = $('savedNote');
  n.textContent = '✓ Bewaard' + (what ? ': ' + what : '');
  n.classList.add('saved');
  clearTimeout(S.savedTimer);
  S.savedTimer = setTimeout(() => {
    n.textContent = 'Wijzigingen worden direct bewaard';
    n.classList.remove('saved');
  }, 2200);
}

export function toast(text, sub, undo, label) {
  $('toastUndo').textContent = label || 'Ongedaan maken';
  $('toastTxt').innerHTML = '';
  $('toastTxt').append(text);
  if (sub) {
    const s = document.createElement('small');
    s.textContent = sub;
    $('toastTxt').appendChild(s);
  }
  $('toastUndo').hidden = !undo;
  $('toastUndo').onclick = async () => {
    $('toast').hidden = true;
    if (undo) await undo();
  };
  $('toast').hidden = false;
  clearTimeout(S.toastTimer);
  S.toastTimer = setTimeout(() => ($('toast').hidden = true), 6000);
}

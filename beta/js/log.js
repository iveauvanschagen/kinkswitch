// Diagnose-log: de laatste 600 gebeurtenissen op dit apparaat (nooit sleutels of tokens).
import { S } from './state.js';
import { APP_VERSION, IS_PHONE } from './config.js';
import { hasLogin } from './spotify/auth.js';
import { ls } from './store.js';
import { delayMs } from './switcher.js';
import { renderLog } from './ui/diagnose.js';
import { bgOn } from './ui/settings.js';

export const TAB_ID = Math.random().toString(36).slice(2, 6);

export function LOG(cat, lvl, text, data) {
  const e = { t: Date.now(), c: cat, l: lvl, m: String(text).slice(0, 300), tab: TAB_ID };
  if (data !== undefined) {
    try {
      e.d = JSON.stringify(data).slice(0, 600);
    } catch (x) {}
  }
  S.logBuf.push(e);
  if (S.logBuf.length > 600) S.logBuf = S.logBuf.slice(-600);
  clearTimeout(S.logTimer);
  S.logTimer = setTimeout(() => {
    try {
      localStorage.setItem('ks_log', JSON.stringify(S.logBuf));
    } catch (x) {}
  }, 400);
  if (typeof renderLog === 'function' && document.getElementById('dbgModal')?.classList.contains('show'))
    renderLog();
}

export function fmtT(t) {
  const d = new Date(t);
  return d.toLocaleTimeString('nl-NL') + '.' + String(d.getMilliseconds()).padStart(3, '0').slice(0, 1);
}

// Duidelijke namen in de log. Intern blijven de korte codes, zodat oude logs ook goed tonen.
export const CAT_NAME = {
  app: 'APP',
  kink: 'KINK',
  switch: 'WISSEL',
  silly: 'WISSEL',
  spotify: 'SPOTIFY',
  keep: 'WAKKER',
  device: 'APPARAAT',
  api: 'API',
  auth: 'SLEUTEL',
  ui: 'MELDING',
  diag: 'TEST',
  note: 'NOTITIE',
  js: 'FOUT',
};

export const catName = c => CAT_NAME[c] || c.toUpperCase();

export function logLine(e) {
  return (
    fmtT(e.t) +
    ' ' +
    catName(e.c).padEnd(8) +
    ' ' +
    (e.l === 'err' ? 'FOUT ' : e.l === 'warn' ? 'LET OP ' : '') +
    e.m +
    (e.d ? ' ' + e.d : '') +
    (e.tab !== TAB_ID ? ' [tab ' + e.tab + ']' : '')
  );
}

export function logExport() {
  const head = [
    'KINK Switch diagnose',
    'Versie: ' + APP_VERSION,
    'Tijd: ' + new Date().toLocaleString('nl-NL'),
    'Apparaat: ' + (IS_PHONE ? 'telefoon' : 'computer') + ', ' + navigator.userAgent,
    'Koppeling: ' +
      (hasLogin() ? (S.authBroken ? 'verlopen' : 'ok') : 'niet gekoppeld') +
      ', sleutel ' +
      (() => {
        const m = Math.round((+(ls('ks_expiry') || 0) - Date.now()) / 60000);
        return m > 0 ? 'nog ' + m + ' min' : 'verlopen, wordt vernieuwd bij gebruik';
      })(),
    'Scopes: ' + (ls('ks_scope') || '-'),
    'Afspelen op: ' +
      (ls('ks_device') ? 'vast' : 'automatisch') +
      ', mijn apparaat: ' +
      (S.lastDevList.find(x => x.id === ls('ks_myDevice'))?.name || '?'),
    'Vertraging: ' + delayMs() / 1000 + ' s, achtergrond: ' + (bgOn() ? 'aan' : 'uit'),
    '----',
  ];
  return head.join('\n') + '\n' + S.logBuf.map(logLine).join('\n');
}

// Knoppen en invoervelden koppelen
export function watchErrors() {
  window.addEventListener('error', e => LOG('js', 'err', e.message + ' @' + (e.lineno || '?')));

  window.addEventListener('unhandledrejection', e =>
    LOG('js', 'err', 'Promise: ' + ((e.reason && e.reason.message) || e.reason))
  );
}

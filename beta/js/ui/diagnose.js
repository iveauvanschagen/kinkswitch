// Het diagnosescherm: overzicht, log, filters en de testknoppen.
import { S } from '../state.js';
import { APP_VERSION, IS_PHONE, KEEP_EVERY } from '../config.js';
import { $ } from '../dom.js';
import { LOG, TAB_ID, catName, fmtT, logExport } from '../log.js';
import { api } from '../spotify/api.js';
import { getToken, hasLogin } from '../spotify/auth.js';
import { keepAwakeSpotify, keepOn } from '../spotify/keepawake.js';
import { pickDevice, spDevices } from '../spotify/player.js';
import { checkSpotify } from '../spotify/reach.js';
import { ls } from '../store.js';
import { hhmm } from '../util.js';

export function renderLog() {
  const box = $('dbgLog');
  if (!box) return;
  const f = S.dbgFilter;
  const rows = S.logBuf
    .filter(
      e =>
        f === 'all' ||
        (f === 'err' && (e.l === 'err' || e.l === 'warn' || e.c === 'note')) ||
        (f === 'spotify' && ['api', 'auth', 'device', 'spotify', 'keep'].includes(e.c)) ||
        (f === 'switch' && ['switch', 'kink', 'note', 'silly'].includes(e.c)) ||
        (f === 'keep' && ['keep', 'note'].includes(e.c))
    )
    .slice(-300)
    .reverse();
  box.innerHTML = '';
  rows.forEach(e => {
    const d = document.createElement('div');
    d.className = e.c === 'note' ? 'note' : e.l;
    const tm = document.createElement('time');
    tm.textContent = fmtT(e.t);
    d.appendChild(tm);
    d.appendChild(document.createTextNode(catName(e.c) + ' ' + e.m + (e.d ? ' ' + e.d : '')));
    box.appendChild(d);
  });
  if (!rows.length) box.textContent = 'Nog niets gelogd.';
}

export function renderSum() {
  const exp = +(ls('ks_expiry') || 0),
    left = Math.round((exp - Date.now()) / 60000);
  const items = [
    ['VERSIE', APP_VERSION + ' (tab ' + TAB_ID + ')'],
    [
      'APPARAAT',
      (IS_PHONE ? 'Telefoon' : 'Computer') +
        (matchMedia('(display-mode: standalone)').matches ? ', geïnstalleerde app' : ', browser'),
    ],
    [
      'KOPPELING',
      hasLogin()
        ? S.authBroken
          ? '<span class="bad">verlopen</span>'
          : '<span class="good">ok</span>'
        : '<span class="bad">niet gekoppeld</span>',
    ],
    ['SLEUTEL GELDIG', exp ? (left > 0 ? left + ' min' : 'verlopen, wordt vernieuwd bij gebruik') : '-'],
    ['TOESTEMMINGEN', (ls('ks_scope') || '-').split(' ').length + ' scopes'],
    ['AFSPELEN OP', ls('ks_device') ? 'vast apparaat' : 'automatisch'],
    [
      'LAATSTE APPARATEN',
      S.lastDevList.length ? S.lastDevList.map(x => x.name + (x.is_active ? ' *' : '')).join(', ') : '-',
    ],
    [
      'SPOTIFY',
      S.spIssue
        ? '<span class="bad">' + S.spIssue + '</span>'
        : S.spReady
          ? '<span class="good">klaar op ' + S.spReady + '</span>'
          : 'nog niet gecheckt',
    ],
    [
      'WAKKER HOUDEN',
      (keepOn() ? 'aan' : 'uit') +
        (S.lastKeepRun ? ', laatst ' + hhmm(S.lastKeepRun) : '') +
        (keepOn() ? ', volgende rond ' + hhmm(S.lastSpActive + KEEP_EVERY) : ''),
    ],
    [
      'MODUS',
      S.mode +
        (S.autoAway ? ', weg voor reclame' : '') +
        (S.spIssue ? ', <span class="bad">' + S.spIssue + '</span>' : ''),
    ],
    [
      'KINK-GEGEVENS',
      S.kinkNow ? Math.round((Date.now() - S.kinkNow.at) / 1000) + ' s oud' : '<span class="bad">geen</span>',
    ],
    ['ZICHTBAAR', document.visibilityState],
    [
      'LAATSTE FOUT',
      S.lastErr ? S.lastErr.code + ' om ' + new Date(S.lastErr.t).toLocaleTimeString('nl-NL') : '-',
    ],
  ];
  $('dbgSum').innerHTML = items.map(([k, v]) => '<div><b>' + k + '</b>' + v + '</div>').join('');
}

export function openDbg() {
  renderSum();
  renderLog();
  $('dbgModal').classList.add('show');
}

export async function runDiag() {
  LOG('note', 'info', '--- Test Spotify gestart ---');
  try {
    const t = await getToken();
    LOG('diag', 'ok', 'Sleutel ok');
  } catch (e) {
    LOG('diag', 'err', 'Sleutel: ' + e.message);
    renderSum();
    return;
  }
  try {
    const me = await api('/me');
    LOG('diag', 'ok', 'Account: ' + (me?.display_name || '?') + ', product: ' + (me?.product || 'onbekend'));
  } catch (e) {
    LOG('diag', 'err', 'Account: ' + e.message);
  }
  try {
    const l = await spDevices();
    if (l.length) LOG('diag', 'ok', 'Spotify bereikbaar op ' + (pickDevice(l)?.name || '?'));
    else LOG('diag', 'err', 'Geen Spotify-apparaat: open Spotify op je telefoon');
  } catch (e) {
    LOG('diag', 'err', 'Apparaten: ' + e.message);
  }
  try {
    const p = await api('/me/player');
    LOG(
      'diag',
      'info',
      'Speler: ' +
        (p
          ? (p.is_playing ? 'speelt' : 'gepauzeerd') +
            ' op ' +
            (p.device?.name || '?') +
            (p.device?.is_restricted ? ' (beperkt)' : '') +
            ', shuffle ' +
            (p.shuffle_state ? 'aan' : 'uit')
          : 'niets actief')
    );
  } catch (e) {
    LOG('diag', 'err', 'Speler: ' + e.message);
  }
  LOG('note', 'info', '--- Test Spotify klaar ---');
  checkSpotify();
  renderSum();
}

// Knoppen en invoervelden koppelen
export function bindDiagnose() {
  $('openDbg').onclick = () => {
    $('modal').classList.remove('show');
    openDbg();
  };

  $('dbgClose').onclick = () => $('dbgModal').classList.remove('show');

  $('dbgRun').onclick = () => runDiag();

  $('dbgKeep').onclick = () => {
    LOG('note', 'info', '--- Test wakker houden ---');
    keepAwakeSpotify(true);
  };

  $('dbgMark').onclick = () => {
    LOG('note', 'err', '>>> GEBRUIKER: er ging net iets mis <<<');
    renderLog();
    $('dbgMark').textContent = 'Gemarkeerd';
    setTimeout(() => ($('dbgMark').textContent = 'Er ging net iets mis'), 1500);
  };

  $('dbgNote').onclick = () => {
    const t = prompt("Wat gebeurde er? (bijvoorbeeld: Don't be silly gedrukt, niets gehoord)");
    if (t) {
      LOG('note', 'info', 'NOTITIE: ' + t);
      renderLog();
    }
  };

  $('dbgCopy').onclick = async () => {
    const t = logExport();
    try {
      await navigator.clipboard.writeText(t);
      $('dbgCopy').textContent = 'Gekopieerd';
    } catch (e) {
      prompt('Kopieer de log', t);
    }
    setTimeout(() => ($('dbgCopy').textContent = 'Kopieer log'), 1500);
  };

  $('dbgShare').onclick = async () => {
    const t = logExport();
    if (navigator.share) {
      try {
        await navigator.share({ title: 'KINK Switch diagnose', text: t });
      } catch (e) {}
    } else {
      try {
        await navigator.clipboard.writeText(t);
        $('dbgShare').textContent = 'Gekopieerd';
      } catch (e) {}
    }
  };

  $('dbgClear').onclick = () => {
    S.logBuf = [];
    try {
      localStorage.removeItem('ks_log');
    } catch (e) {}
    LOG('app', 'info', 'Log gewist');
    renderLog();
  };

  $('dbgFil').onclick = e => {
    const b = e.target.closest('button');
    if (!b) return;
    S.dbgFilter = b.dataset.f;
    [...$('dbgFil').children].forEach(x => x.classList.toggle('on', x === b));
    renderLog();
  };

  setInterval(() => {
    if ($('dbgModal').classList.contains('show')) renderSum();
  }, 2000);

  if (location.hash === '#diagnose') setTimeout(openDbg, 300);

  window.addEventListener('hashchange', () => {
    if (location.hash === '#diagnose') openDbg();
  });
}

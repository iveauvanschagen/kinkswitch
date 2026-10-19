// Het instellingenscherm met de tabbladen Algemeen, Artiesten en Spotify.
import { S } from '../state.js';
import { banList, favList, saveBans, saveFavs } from '../artists.js';
import { IS_PHONE, REDIRECT } from '../config.js';
import { $ } from '../dom.js';
import { connect, hasLogin } from '../spotify/auth.js';
import { keepOn } from '../spotify/keepawake.js';
import { spDevices } from '../spotify/player.js';
import { ls } from '../store.js';
import { delayMs, setAway, tick } from '../switcher.js';
import { msg, saved, setSw } from './status.js';
import { renderAuto, renderFavBtns, showKink } from './tiles.js';
import { norm } from '../util.js';
import { keepAwake } from '../wakelock.js';

export function bgDefault() {
  return !(window.matchMedia && matchMedia('(pointer:coarse)').matches);
}

export function bgOn() {
  const v = ls('ks_bg');
  return v === null ? bgDefault() : v === '1';
}

export function settingsTab(t) {
  if (t === 'Sp') renderDevices();
  [
    ['Alg', 'stAlg'],
    ['Art', 'stArt'],
    ['Sp', 'stSp'],
  ].forEach(([k, b]) => {
    $(b).classList.toggle('on', k === t);
    $('pane' + k).hidden = k !== t;
  });
  document.querySelector('.set .sbody').scrollTop = 0;
}

export async function renderDevices() {
  const box = $('devList');
  if (!box) return;
  if (!hasLogin()) {
    box.innerHTML = '<div class="sub">Koppel eerst Spotify.</div>';
    return;
  }
  box.innerHTML = '<div class="sub">Apparaten laden...</div>';
  let list = [];
  try {
    list = await spDevices();
  } catch (e) {}
  const cur = ls('ks_device') || '';
  box.innerHTML = '';
  const kinds = {
    Smartphone: 'Telefoon',
    Computer: 'Computer',
    Tablet: 'Tablet',
    Speaker: 'Speaker',
    TV: 'TV',
    CastAudio: 'Cast',
    AVR: 'Versterker',
    Automobile: 'Auto',
  };
  const opt = (id, title, sub) => {
    const b = document.createElement('button');
    b.className = 'devopt' + (cur === id ? ' on' : '');
    b.innerHTML = '<span class="rad"></span><span style="min-width:0"><b></b><small></small></span>';
    b.querySelector('b').textContent = title;
    b.querySelector('small').textContent = sub;
    b.onclick = () => {
      ls('ks_device', id || null);
      saved('afspelen op ' + (id ? title : 'dit apparaat'));
      renderDevices();
    };
    box.appendChild(b);
  };
  opt(
    '',
    'Automatisch (dit apparaat)',
    IS_PHONE ? 'De Spotify-app op deze telefoon' : 'Spotify op deze computer'
  );
  list.forEach(d => opt(d.id, d.name, (kinds[d.type] || d.type) + (d.is_active ? ', speelt nu' : '')));
  if (cur && !list.some(d => d.id === cur)) {
    const n = document.createElement('div');
    n.className = 'sub';
    n.textContent = 'Je gekozen apparaat is nu niet bereikbaar. De app kiest dan automatisch.';
    box.appendChild(n);
  }
  if (!list.length) {
    const n = document.createElement('div');
    n.className = 'sub';
    n.textContent = 'Geen Spotify-apparaten gevonden. Open Spotify en tik op Vernieuw lijst.';
    box.appendChild(n);
  }
}

export function renderSpAccount() {
  const on = hasLogin() && !S.authBroken;
  $('spIcon').className = 'ok ' + (on ? 'yes' : 'no');
  $('spIcon').textContent = on ? '✓' : '!';
  $('spState').textContent = on
    ? 'Gekoppeld met Spotify'
    : S.authBroken
      ? 'Koppeling verlopen'
      : 'Niet gekoppeld';
  $('spSub').textContent = on
    ? 'Speelt af via je Spotify-app'
    : ls('ks_client')
      ? 'Tik op Koppel Spotify'
      : 'Vul eerst je Client ID in onder Geavanceerd';
  $('connect').textContent = on ? 'Opnieuw koppelen' : 'Koppel Spotify';
  $('connect').classList.toggle('primary', !on);
  $('logout').hidden = !on;
  if (!ls('ks_client')) $('adv').open = true;
}

export function settings(tab) {
  if (typeof tab !== 'string') tab = 'Alg';
  setSw('swAuto', S.auto);
  setSw('swWake', ls('ks_wake') === '1');
  setSw('swBg', bgOn());
  setSw('swShuffle', ls('ks_shuffle') !== '0');
  setSw('swKeep', keepOn());
  $('delay').value = delayMs() / 1000;
  $('clientId').value = ls('ks_client') || '';
  $('redirectUri').value =
    location.protocol === 'file:' ? 'Niet beschikbaar bij een lokaal bestand' : REDIRECT;
  renderLists();
  renderSpAccount();
  settingsTab(tab || 'Alg');
  $('savedNote').textContent = 'Wijzigingen worden direct bewaard';
  $('savedNote').classList.remove('saved');
  $('modal').classList.add('show');
}

export function chip2(name, cls, onRemove) {
  const b = document.createElement('button');
  b.className = 'chip2 ' + cls;
  b.textContent = name;
  const x = document.createElement('span');
  x.className = 'x';
  x.textContent = '×';
  b.appendChild(x);
  b.setAttribute('aria-label', name + ' verwijderen');
  b.onclick = onRemove;
  return b;
}

export function renderLists() {
  const h = $('hearChips'),
    k = $('skipChips');
  h.innerHTML = '';
  k.innerHTML = '';
  favList().forEach(n =>
    h.appendChild(
      chip2(n, 'hear', () => {
        saveFavs(favList().filter(f => norm(f) !== norm(n)));
        renderLists();
        afterListChange();
        saved(n + ' uit Must hear');
      })
    )
  );
  banList().forEach(n =>
    k.appendChild(
      chip2(n, 'skip', () => {
        saveBans(banList().filter(f => norm(f) !== norm(n)));
        renderLists();
        afterListChange();
        saved(n + ' uit Must skip');
      })
    )
  );
  if (!h.children.length)
    h.innerHTML = '<span class="empty">Nog leeg. Voeg hieronder een artiest toe.</span>';
  if (!k.children.length)
    k.innerHTML = '<span class="empty">Nog leeg. Voeg hieronder een artiest toe.</span>';
}

export function afterListChange() {
  S.lastFavKey = '';
  showKink();
  renderFavBtns();
}

export function addTo(kind) {
  const inp = $(kind === 'hear' ? 'newHear' : 'newSkip'),
    n = inp.value.trim();
  if (!n) return;
  const list = kind === 'hear' ? favList() : banList();
  if (!list.some(f => norm(f) === norm(n))) {
    (kind === 'hear' ? saveFavs : saveBans)([...list, n]);
    saved(n + ' in ' + (kind === 'hear' ? 'Must hear' : 'Must skip'));
  } else saved(n + ' stond er al in');
  inp.value = '';
  renderLists();
  afterListChange();
}

// Knoppen en invoervelden koppelen
export function bindSettings() {
  $('shareLink').onclick = async () => {
    const id = $('clientId').value.trim() || ls('ks_client') || '';
    if (!id) return msg('Vul eerst een Client ID in', true);
    const link = REDIRECT + '?client=' + id;
    try {
      await navigator.clipboard.writeText(link);
      $('shareLink').textContent = 'Link gekopieerd';
    } catch (e) {
      prompt('Kopieer deze link', link);
    }
  };

  $('openSettings').onclick = () => settings();

  $('closeSettings').onclick = () => {
    $('modal').classList.remove('show');
    tick();
  };

  $('devRefresh').onclick = () => renderDevices();

  $('swKeep').onclick = () => {
    const on = !keepOn();
    ls('ks_keep', on ? '1' : '0');
    setSw('swKeep', on);
    S.lastSpActive = Date.now();
    saved('Spotify wakker houden ' + (on ? 'aan' : 'uit'));
  };

  $('stAlg').onclick = () => settingsTab('Alg');

  $('stArt').onclick = () => settingsTab('Art');

  $('stSp').onclick = () => settingsTab('Sp');

  $('swAuto').onclick = () => {
    S.auto = !S.auto;
    ls('ks_auto', S.auto ? '1' : '0');
    if (!S.auto) setAway(0);
    setSw('swAuto', S.auto);
    renderAuto();
    saved('wisselen bij reclame ' + (S.auto ? 'aan' : 'uit'));
  };

  $('swWake').onclick = () => {
    const on = ls('ks_wake') !== '1';
    ls('ks_wake', on ? '1' : '0');
    setSw('swWake', on);
    if (on) keepAwake();
    else if (S.wakeLock) {
      S.wakeLock.release().catch(() => {});
      S.wakeLock = null;
    }
    saved('scherm aan houden ' + (on ? 'aan' : 'uit'));
  };

  $('swBg').onclick = () => {
    const on = !bgOn();
    ls('ks_bg', on ? '1' : '0');
    setSw('swBg', on);
    saved('op de achtergrond meekijken ' + (on ? 'aan' : 'uit'));
  };

  $('swShuffle').onclick = () => {
    const on = ls('ks_shuffle') === '0';
    ls('ks_shuffle', on ? '1' : '0');
    setSw('swShuffle', on);
    saved('shuffle ' + (on ? 'aan' : 'uit'));
  };

  $('delay').onchange = () => {
    const v = Math.max(0, Math.min(60, Math.round(Number($('delay').value) || 0)));
    $('delay').value = v;
    ls('ks_delay2', String(v));
    saved('vertraging ' + v + ' seconden');
  };

  $('clientId').onchange = () => {
    ls('ks_client', $('clientId').value.trim());
    renderSpAccount();
    saved('Client ID');
  };

  $('addHear').onclick = () => addTo('hear');

  $('newHear').onkeydown = e => {
    if (e.key === 'Enter') addTo('hear');
  };

  $('addSkip').onclick = () => addTo('skip');

  $('newSkip').onkeydown = e => {
    if (e.key === 'Enter') addTo('skip');
  };

  $('copyRedirect').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('redirectUri').value);
      $('copyRedirect').textContent = 'Gekopieerd';
    } catch (e) {
      $('redirectUri').select();
    }
  };

  $('connect').onclick = connect;

  $('logout').onclick = () => {
    ['ks_token', 'ks_expiry', 'ks_refresh', 'ks_verifier', 'ks_state', 'ks_scope'].forEach(k => ls(k, null));
    S.token = null;
    msg('Spotify ontkoppeld');
    renderSpAccount();
    saved('Spotify ontkoppeld');
  };
}

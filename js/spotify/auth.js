// Koppelen met Spotify (OAuth met PKCE) en de sleutel op tijd vernieuwen.
// De vernieuwingssleutel is maar één keer bruikbaar, dus er vernieuwt er maar één tegelijk:
// binnen dit tabblad (S.refreshing) en over tabbladen heen (Web Locks).
import { S } from '../state.js';
import { REDIRECT, SCOPES } from '../config.js';
import { $ } from '../dom.js';
import { LOG, TAB_ID } from '../log.js';
import { clearSpIssue, setSpIssue } from './reach.js';
import { ls } from '../store.js';
import { openPicker } from '../ui/picker.js';
import { msg } from '../ui/status.js';
import { b64, rand } from '../util.js';

export async function connect() {
  const id = $('clientId').value.trim();
  if (!/^[0-9a-f]{32}$/i.test(id)) return msg('De Client ID moet 32 tekens zijn (cijfers en a t/m f).', true);
  if (location.protocol !== 'https:' && location.hostname !== '127.0.0.1')
    return msg('Deze app moet op een HTTPS-adres staan, bijvoorbeeld GitHub Pages.', true);
  ls('ks_client', id);
  const verifier = rand(32),
    challenge = b64(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))),
    state = rand(16);
  ls('ks_verifier', verifier);
  ls('ks_state', state);
  ls('ks_client', id);
  ls('ks_redirect', REDIRECT);
  const u = new URL('https://accounts.spotify.com/authorize');
  u.search = new URLSearchParams({
    client_id: id,
    response_type: 'code',
    redirect_uri: REDIRECT,
    scope: SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    show_dialog: 'true',
  }).toString();
  location.href = u.toString();
}

export function saveToken(d) {
  S.token = d.access_token;
  S.tokenExpiry = Date.now() + d.expires_in * 1000;
  ls('ks_token', S.token);
  ls('ks_expiry', String(S.tokenExpiry));
  if (d.refresh_token) ls('ks_refresh', d.refresh_token);
  if (d.scope) ls('ks_scope', d.scope);
}

export function hasLogin() {
  return !!(ls('ks_refresh') || ls('ks_token'));
}

export async function callback() {
  const q = new URLSearchParams(location.search);
  if (q.get('error')) {
    history.replaceState({}, document.title, location.pathname);
    const e = q.get('error');
    return msg(
      e === 'access_denied'
        ? 'Koppelen geannuleerd in Spotify.'
        : 'Spotify weigerde: ' + e + '. Staat je account onder User Management in het dashboard?',
      true
    );
  }
  const code = q.get('code');
  if (!code) return;
  history.replaceState({}, document.title, location.pathname);
  if (q.get('state') !== ls('ks_state'))
    return msg('Koppelen mislukt: ongeldige state. Probeer opnieuw.', true);
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: ls('ks_client'),
        grant_type: 'authorization_code',
        code,
        redirect_uri: ls('ks_redirect'),
        code_verifier: ls('ks_verifier'),
      }),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error_description || d.error);
    saveToken(d);
    ls('ks_verifier', null);
    ls('ks_state', null);
    msg(
      'Spotify gekoppeld.' +
        (ls('ks_playlist') ? ' Tik op Spotify om je playlist te starten.' : ' Kies nu een playlist.')
    );
    if (!ls('ks_playlist')) openPicker();
  } catch (e) {
    msg('Koppelen mislukt: ' + e.message, true);
  }
}

export function freshStored() {
  const t = ls('ks_token'),
    e = +(ls('ks_expiry') || 0);
  return t && Date.now() < e - 60000 ? { t, e } : null;
}

export async function getToken() {
  if (S.token && Date.now() < S.tokenExpiry - 60000) return S.token;
  const f = freshStored();
  if (f) {
    S.token = f.t;
    S.tokenExpiry = f.e;
    return S.token;
  }
  if (!S.refreshing)
    S.refreshing = doRefresh().finally(() => {
      S.refreshing = null;
    });
  return S.refreshing;
}

export async function doRefresh() {
  const run = async () => {
    // Misschien heeft een ander tabblad net vernieuwd
    const f = freshStored();
    if (f) {
      S.token = f.t;
      S.tokenExpiry = f.e;
      S.authBroken = false;
      return S.token;
    }
    const refresh = ls('ks_refresh'),
      id = ls('ks_client');
    if (!refresh || !id) {
      LOG('auth', 'err', 'Geen vernieuwingssleutel of Client ID');
      throw Error('Koppel eerst Spotify via Instellingen');
    }
    LOG('auth', 'info', 'Sleutel vernieuwen (tab ' + TAB_ID + ')');
    let r,
      d = {};
    try {
      r = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: id, grant_type: 'refresh_token', refresh_token: refresh }),
      });
      d = await r.json().catch(() => ({}));
    } catch (e) {
      LOG('auth', 'err', 'Vernieuwen: netwerkfout ' + e.message);
      S.lastErr = { t: Date.now(), code: 'AUTH NET' };
      throw Error('Geen verbinding met Spotify. De app probeert het zo opnieuw.');
    }
    if (!r.ok) {
      LOG(
        'auth',
        'err',
        'Vernieuwen geweigerd: ' + r.status + ' ' + (d.error || '') + ' ' + (d.error_description || '')
      );
      S.lastErr = { t: Date.now(), code: 'AUTH ' + r.status + ' ' + (d.error || '') };
      if (d.error === 'invalid_grant') {
        // Is de sleutel intussen door een ander tabblad vervangen? Dan die gebruiken.
        const f2 = freshStored();
        if (f2 && ls('ks_refresh') !== refresh) {
          S.token = f2.t;
          S.tokenExpiry = f2.e;
          return S.token;
        }
        S.authBroken = true;
        setSpIssue('login');
        throw Error('Spotify-login verlopen. Tik op de Spotify-tegel om opnieuw te koppelen.');
      }
      throw Error('Spotify is even niet bereikbaar. De app probeert het zo opnieuw.');
    }
    saveToken(d);
    S.authBroken = false;
    LOG(
      'auth',
      'ok',
      'Sleutel vernieuwd, geldig tot ' +
        new Date(S.tokenExpiry).toLocaleTimeString('nl-NL') +
        (d.refresh_token ? ' (nieuwe vernieuwingssleutel)' : '')
    );
    if (S.spIssue === 'login') clearSpIssue(true);
    return S.token;
  };
  return navigator.locks && navigator.locks.request
    ? navigator.locks.request('kink-switch-token', run)
    : run();
}
